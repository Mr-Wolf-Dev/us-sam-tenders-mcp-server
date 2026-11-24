import type { ActorInput, NormalizedOpportunity } from '../domain/opportunity-schema.js';

export interface OpportunitySource {
  searchOpportunities(criteria: ActorInput): Promise<NormalizedOpportunity[]>;
  getOpportunityById(opportunityId: string): Promise<NormalizedOpportunity | null>;
}
