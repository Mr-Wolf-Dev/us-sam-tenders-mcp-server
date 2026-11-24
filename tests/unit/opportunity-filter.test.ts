import { describe, expect, it } from 'vitest';
import { filterAndDeduplicateOpportunities } from '../../src/domain/opportunity-filter.js';
import type { NormalizedOpportunity } from '../../src/domain/opportunity-schema.js';

const SAMPLES: NormalizedOpportunity[] = [
  {
    opportunityId: 'opp-1',
    solicitationNumber: 'S1',
    title: 'Cybersecurity Operations',
    noticeTypeCode: 'o',
    noticeType: 'Solicitation',
    department: 'DEPT OF DEFENSE',
    agency: 'NAVY',
    office: null,
    isActive: true,
    isCanceled: false,
    publishedDate: '2026-11-20',
    modifiedDate: '2026-11-22',
    responseDeadline: '2026-12-15',
    naicsCodes: [],
    classificationCode: null,
    pointOfContact: [],
    description: null,
    samUrl: 'https://sam.gov/opp/opp-1/view',
  },
  {
    opportunityId: 'opp-1',
    solicitationNumber: 'S1',
    title: 'Cybersecurity Operations',
    noticeTypeCode: 'o',
    noticeType: 'Solicitation',
    department: 'DEPT OF DEFENSE',
    agency: 'NAVY',
    office: null,
    isActive: true,
    isCanceled: false,
    publishedDate: '2026-11-20',
    modifiedDate: '2026-11-22',
    responseDeadline: '2026-12-15',
    naicsCodes: [],
    classificationCode: null,
    pointOfContact: [],
    description: null,
    samUrl: 'https://sam.gov/opp/opp-1/view',
  },
  {
    opportunityId: 'opp-2',
    solicitationNumber: 'S2',
    title: 'Canceled Notice',
    noticeTypeCode: 'p',
    noticeType: 'Presolicitation',
    department: 'HOMELAND SECURITY',
    agency: null,
    office: null,
    isActive: true,
    isCanceled: true,
    publishedDate: '2026-11-24',
    modifiedDate: '2026-11-24',
    responseDeadline: '2026-12-30',
    naicsCodes: [],
    classificationCode: null,
    pointOfContact: [],
    description: null,
    samUrl: 'https://sam.gov/opp/opp-2/view',
  },
];

describe('filterAndDeduplicateOpportunities', () => {
  it('deduplicates, excludes canceled when activeOnly=true, and filters by department & deadline', () => {
    const result = filterAndDeduplicateOpportunities(SAMPLES, {
      noticeTypes: ['o'],
      departments: ['defense'],
      activeOnly: true,
      publishedFrom: '2026-11-15',
      minDeadline: '2026-12-01',
      maxItems: 50,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.opportunityId).toBe('opp-1');
  });
});
