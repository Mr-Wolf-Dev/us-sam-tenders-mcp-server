import { describe, expect, it } from 'vitest';
import { runOpportunityExtraction, type SamBillingEvent } from '../../src/adapters/apify-actor.js';
import type { NormalizedOpportunity } from '../../src/domain/opportunity-schema.js';
import type { OpportunitySource } from '../../src/ports/opportunity-source.js';
import type { BillingMeter } from '../../src/shared/billing-meter.js';

const fakeSource: OpportunitySource = {
  async searchOpportunities() {
    return [
      {
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
        pointOfContact: [],
        description: 'Build AI analytics.',
        samUrl: 'https://sam.gov/opp/opp-100/view',
      },
    ];
  },
  async getOpportunityById() {
    return null;
  },
};

describe('runOpportunityExtraction', () => {
  it('pushes normalized opportunities and charges tender-extracted PPE events', async () => {
    const pushed: NormalizedOpportunity[] = [];
    const charges: Array<{ eventName: SamBillingEvent; count: number }> = [];

    const billing: BillingMeter<SamBillingEvent> = {
      async charge(eventName, count = 1) {
        charges.push({ eventName, count });
      },
    };

    const result = await runOpportunityExtraction(
      { query: 'AI', maxItems: 10 },
      {
        source: fakeSource,
        billing,
        pushData: async (items) => {
          pushed.push(...items);
        },
      },
    );

    expect(result).toHaveLength(1);
    expect(pushed).toHaveLength(1);
    expect(charges).toEqual([{ eventName: 'tender-extracted', count: 1 }]);
  });
});
