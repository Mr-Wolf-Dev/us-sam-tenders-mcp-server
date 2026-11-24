import { describe, expect, it } from 'vitest';
import { parseSamDetailResponse, parseSamSearchResponse } from '../../src/domain/sam-parser.js';

describe('parseSamSearchResponse', () => {
  it('parses _embedded.results and organizationHierarchy', () => {
    const payload = {
      page: { totalElements: 1 },
      _embedded: {
        results: [
          {
            _id: 'abc123',
            title: 'Cloud Security Platform',
            solicitationNumber: 'SOL-2026-01',
            isActive: true,
            isCanceled: false,
            publishDate: '2026-11-24T10:00:00+00:00',
            modifiedDate: '2026-11-24T12:00:00+00:00',
            responseDate: '2026-12-20T20:00:00+00:00',
            type: { code: 'o', value: 'Solicitation' },
            descriptions: [{ content: '<p>Provide cloud security monitoring.</p>' }],
            organizationHierarchy: [
              { level: 1, name: 'DEPT OF DEFENSE' },
              { level: 2, name: 'DEFENSE LOGISTICS AGENCY' },
              { level: 3, name: 'DLA MARITIME' },
            ],
          },
        ],
      },
    };

    const { totalElements, opportunities } = parseSamSearchResponse(payload);
    expect(totalElements).toBe(1);
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]).toMatchObject({
      opportunityId: 'abc123',
      solicitationNumber: 'SOL-2026-01',
      noticeTypeCode: 'o',
      noticeType: 'Solicitation',
      department: 'DEPT OF DEFENSE',
      agency: 'DEFENSE LOGISTICS AGENCY',
      office: 'DLA MARITIME',
      publishedDate: '2026-11-24',
      responseDeadline: '2026-12-20',
      description: 'Provide cloud security monitoring.',
      samUrl: 'https://sam.gov/opp/abc123/view',
    });
  });
});

describe('parseSamDetailResponse', () => {
  it('extracts NAICS codes and pointOfContact', () => {
    const detailPayload = {
      opportunityId: 'abc123',
      postedDate: '2026-11-24T10:00:00+00:00',
      data2: {
        title: 'Cloud Security Platform',
        classificationCode: 'D310',
        naics: [{ code: ['541512', '541519'] }],
        pointOfContact: [
          {
            type: 'primary',
            email: 'officer@agency.gov',
            fullName: 'Jane Doe',
            phone: '555-0100',
          },
        ],
      },
    };

    const parsed = parseSamDetailResponse(detailPayload);
    expect(parsed.naicsCodes).toEqual(['541512', '541519']);
    expect(parsed.classificationCode).toBe('D310');
    expect(parsed.pointOfContact).toEqual([
      { type: 'primary', email: 'officer@agency.gov', fullName: 'Jane Doe', phone: '555-0100' },
    ]);
  });
});
