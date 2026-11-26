import type { Server } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { filterAndDeduplicateOpportunities } from '../domain/opportunity-filter.js';
import { parseActorInput } from '../domain/opportunity-schema.js';
import type { OpportunitySource } from '../ports/opportunity-source.js';
import type { BillingMeter } from '../shared/billing-meter.js';
import { createMcpHttpServer } from '../shared/mcp-http-server.js';
import type { SamBillingEvent } from './apify-actor.js';

export interface McpServerDependencies {
  source: OpportunitySource;
  billing: BillingMeter<SamBillingEvent>;
}

export function createConfiguredMcpServer(deps: McpServerDependencies): McpServer {
  const server = new McpServer({
    name: 'us-sam-tenders-mcp-server',
    version: '0.1.0',
  });

  server.registerTool(
    'search_us_contracts',
    {
      description:
        'Search active US federal contract opportunities, RFPs, and solicitations on SAM.gov without an API key.',
      inputSchema: {
        query: z.string().optional().describe('Search keyword (e.g. "cybersecurity", "cloud", "software")'),
        noticeTypes: z
          .array(z.string())
          .optional()
          .describe('Notice type codes or names (e.g. ["o", "k", "p", "r"])'),
        departments: z
          .array(z.string())
          .optional()
          .describe('Department or agency substrings (e.g. ["DEFENSE", "HOMELAND"])'),
        activeOnly: z.boolean().optional().describe('Only return active non-canceled notices (default true)'),
        publishedFrom: z.string().optional().describe('Minimum publication date (YYYY-MM-DD)'),
        minDeadline: z.string().optional().describe('Minimum response deadline (YYYY-MM-DD)'),
        includeDetails: z
          .boolean()
          .optional()
          .describe('Enrich each opportunity with NAICS codes and contracting officer contacts'),
        maxItems: z.number().int().min(1).max(100).optional().describe('Maximum opportunities to return'),
      },
    },
    async ({
      query,
      noticeTypes,
      departments,
      activeOnly,
      publishedFrom,
      minDeadline,
      includeDetails,
      maxItems,
    }) => {
      const criteria = parseActorInput({
        query: query ?? '',
        noticeTypes: noticeTypes ?? [],
        departments: departments ?? [],
        activeOnly: activeOnly ?? true,
        publishedFrom,
        minDeadline,
        includeDetails: includeDetails ?? false,
        maxItems: maxItems ?? 20,
      });

      const raw = await deps.source.searchOpportunities(criteria);
      const opportunities = filterAndDeduplicateOpportunities(raw, criteria);
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: opportunities.length, opportunities }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_opportunity_details',
    {
      description:
        'Fetch full details for a specific SAM.gov opportunity ID, including NAICS codes and contracting officer contact info.',
      inputSchema: {
        opportunityId: z.string().min(1).describe('SAM.gov 32-char opportunity ID'),
      },
    },
    async ({ opportunityId }) => {
      const opportunity = await deps.source.getOpportunityById(opportunityId);
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ found: opportunity !== null, opportunity }, null, 2),
          },
        ],
      };
    },
  );

  return server;
}

/**
 * Creates a stateless Streamable HTTP MCP server compatible with Apify Standby mode.
 */
export function createSamMcpHttpServer(deps: McpServerDependencies): Server {
  return createMcpHttpServer({
    serviceName: 'us-sam-tenders-mcp-server',
    createServer: () => createConfiguredMcpServer(deps),
  });
}
