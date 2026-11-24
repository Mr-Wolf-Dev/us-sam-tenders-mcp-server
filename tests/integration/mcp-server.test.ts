import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SamBillingEvent } from '../../src/adapters/apify-actor.js';
import { createSamMcpHttpServer } from '../../src/adapters/mcp-server.js';
import type { NormalizedOpportunity } from '../../src/domain/opportunity-schema.js';
import type { OpportunitySource } from '../../src/ports/opportunity-source.js';
import type { BillingMeter } from '../../src/shared/billing-meter.js';

const SAMPLE_OPP: NormalizedOpportunity = {
  opportunityId: 'opp-100',
  solicitationNumber: 'SOL-100',
  title: 'AI Analytics Platform',
  noticeTypeCode: 'o',
  noticeType: 'Solicitation',
  department: 'DEPT OF DEFENSE',
  agency: 'AIR FORCE',
  office: null,
  isActive: true,
  isCanceled: false,
  publishedDate: '2026-11-24',
  modifiedDate: '2026-11-24',
  responseDeadline: '2026-12-20',
  naicsCodes: ['541511'],
  classificationCode: 'D310',
  pointOfContact: [{ fullName: 'Jane Doe', email: 'jane@us.af.mil', phone: null, type: 'primary' }],
  description: 'Build AI analytics.',
  samUrl: 'https://sam.gov/opp/opp-100/view',
};

const fakeSource: OpportunitySource = {
  async searchOpportunities() {
    return [SAMPLE_OPP];
  },
  async getOpportunityById(id) {
    return id === 'opp-100' ? SAMPLE_OPP : null;
  },
};

describe('createSamMcpHttpServer', () => {
  const charges: Array<{ eventName: SamBillingEvent; count: number }> = [];
  const billing: BillingMeter<SamBillingEvent> = {
    async charge(eventName, count = 1) {
      charges.push({ eventName, count });
    },
  };

  let baseUrl = '';
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const server = createSamMcpHttpServer({
      source: fakeSource,
      billing,
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    closeServer = () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
  });

  afterAll(async () => {
    await closeServer();
  });

  it('responds 200 on GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'ok',
      service: 'us-sam-tenders-mcp-server',
    });
  });

  it('exposes search_us_contracts and get_opportunity_details and charges mcp-query', async () => {
    const client = new Client({ name: 'test-mcp-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'get_opportunity_details',
      'search_us_contracts',
    ]);

    const searchRes = await client.callTool({
      name: 'search_us_contracts',
      arguments: { query: 'AI', departments: ['DEFENSE'] },
    });
    const searchParsed = JSON.parse(
      (searchRes.content as Array<{ type: string; text: string }>)[0]?.text ?? '',
    ) as { count: number; opportunities: Array<{ opportunityId: string }> };
    expect(searchParsed.count).toBe(1);
    expect(searchParsed.opportunities[0]?.opportunityId).toBe('opp-100');

    const detailRes = await client.callTool({
      name: 'get_opportunity_details',
      arguments: { opportunityId: 'opp-100' },
    });
    const detailParsed = JSON.parse(
      (detailRes.content as Array<{ type: string; text: string }>)[0]?.text ?? '',
    ) as { found: boolean; opportunity: { naicsCodes: string[] } };
    expect(detailParsed.found).toBe(true);
    expect(detailParsed.opportunity.naicsCodes).toEqual(['541511']);

    expect(charges).toEqual([
      { eventName: 'mcp-query', count: 1 },
      { eventName: 'mcp-query', count: 1 },
    ]);

    await transport.close();
  });
});
