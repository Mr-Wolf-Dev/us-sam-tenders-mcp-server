import { Actor } from 'apify';
import { filterAndDeduplicateOpportunities } from '../domain/opportunity-filter.js';
import { parseActorInput, type NormalizedOpportunity } from '../domain/opportunity-schema.js';
import type { OpportunitySource } from '../ports/opportunity-source.js';
import type { BillingMeter } from '../shared/billing-meter.js';

export type SamBillingEvent = 'tender-extracted' | 'mcp-query';

export interface ExtractionDependencies {
  source: OpportunitySource;
  billing: BillingMeter<SamBillingEvent>;
  pushData: (items: NormalizedOpportunity[]) => Promise<void>;
}

/**
 * Validates input, queries SAM.gov, filters/deduplicates, pushes to dataset, and charges PPE events.
 */
export async function runOpportunityExtraction(
  rawInput: unknown,
  deps: ExtractionDependencies,
): Promise<NormalizedOpportunity[]> {
  const criteria = parseActorInput(rawInput);
  const raw = await deps.source.searchOpportunities(criteria);
  const opportunities = filterAndDeduplicateOpportunities(raw, criteria);

  if (opportunities.length > 0) {
    await deps.pushData(opportunities);
    await deps.billing.charge('tender-extracted', opportunities.length);
  }

  return opportunities;
}

/**
 * Runs the standard batch Apify Actor extraction mode.
 */
export async function runActorBatch(
  source: OpportunitySource,
  billing: BillingMeter<SamBillingEvent>,
): Promise<void> {
  const input = await Actor.getInput();
  await runOpportunityExtraction(input, {
    source,
    billing,
    pushData: async (items) => {
      await Actor.pushData(items);
    },
  });
}
