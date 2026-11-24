import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { SamHttpClient } from '../../src/adapters/sam-http-client.js';

const SEARCH_URL = 'https://sam.gov/api/prod/sgs/v1/search/';
const DETAIL_URL = 'https://sam.gov/api/prod/opps/v2/opportunities';
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SamHttpClient', () => {
  it('paginates search results and optionally enriches details', async () => {
    server.use(
      http.get(SEARCH_URL, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');
        if (page === '0') {
          return HttpResponse.json({
            page: { totalElements: 2 },
            _embedded: {
              results: [
                {
                  _id: 'id-1',
                  title: 'Software Modernisation',
                  isActive: true,
                  isCanceled: false,
                  publishDate: '2026-11-24T00:00:00Z',
                },
              ],
            },
          });
        }
        return HttpResponse.json({
          page: { totalElements: 2 },
          _embedded: {
            results: [
              {
                _id: 'id-2',
                title: 'Cloud Migration',
                isActive: true,
                isCanceled: false,
                publishDate: '2026-11-23T00:00:00Z',
              },
            ],
          },
        });
      }),
      http.get(`${DETAIL_URL}/id-1`, () =>
        HttpResponse.json({
          opportunityId: 'id-1',
          data2: {
            naics: [{ code: ['541511'] }],
            pointOfContact: [{ email: 'co1@gov.mil', fullName: 'CO One' }],
          },
        }),
      ),
      http.get(`${DETAIL_URL}/id-2`, () => new HttpResponse(null, { status: 404 })),
    );

    const client = new SamHttpClient({ pageSize: 1, maxRetries: 2, retryDelayMs: 0 });
    const results = await client.searchOpportunities({
      query: 'software',
      noticeTypes: [],
      departments: [],
      activeOnly: true,
      includeDetails: true,
      maxItems: 2,
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.naicsCodes).toEqual(['541511']);
    expect(results[0]?.pointOfContact[0]?.email).toBe('co1@gov.mil');
    expect(results[1]?.opportunityId).toBe('id-2');
  });

  it('returns null when getOpportunityById receives 404', async () => {
    server.use(
      http.get(`${DETAIL_URL}/missing-id`, () => new HttpResponse(null, { status: 404 })),
    );

    const client = new SamHttpClient({ maxRetries: 1, retryDelayMs: 0 });
    expect(await client.getOpportunityById('missing-id')).toBeNull();
  });
});
