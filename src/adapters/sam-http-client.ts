import type { ActorInput, NormalizedOpportunity } from '../domain/opportunity-schema.js';
import { parseSamDetailResponse, parseSamSearchResponse } from '../domain/sam-parser.js';
import type { OpportunitySource } from '../ports/opportunity-source.js';
import { fetchJsonWithRetry } from '../shared/http-client.js';

const DEFAULT_SEARCH_BASE_URL = 'https://sam.gov/api/prod/sgs/v1/search/';
const DEFAULT_DETAIL_BASE_URL = 'https://sam.gov/api/prod/opps/v2/opportunities';

const SAM_HEADERS = {
  Accept: 'application/hal+json, application/json, */*',
  'User-Agent': 'Mozilla/5.0 (compatible; ApifySamBot/1.0)',
};

export interface SamHttpClientOptions {
  searchBaseUrl?: string;
  detailBaseUrl?: string;
  pageSize?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Keyless HTTP-only client for SAM.gov federal contract opportunities.
 */
export class SamHttpClient implements OpportunitySource {
  private readonly searchBaseUrl: string;
  private readonly detailBaseUrl: string;
  private readonly pageSize: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(options: SamHttpClientOptions = {}) {
    this.searchBaseUrl = options.searchBaseUrl ?? DEFAULT_SEARCH_BASE_URL;
    this.detailBaseUrl = options.detailBaseUrl ?? DEFAULT_DETAIL_BASE_URL;
    this.pageSize = options.pageSize ?? 25;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
  }

  async searchOpportunities(criteria: ActorInput): Promise<NormalizedOpportunity[]> {
    const collected: NormalizedOpportunity[] = [];
    let page = 0;

    while (collected.length < criteria.maxItems) {
      const size = Math.min(this.pageSize, criteria.maxItems - collected.length);
      const url = new URL(this.searchBaseUrl);
      url.searchParams.set('index', 'opp');
      url.searchParams.set('mode', 'search');
      url.searchParams.set('sort', '-modifiedDate');
      url.searchParams.set('page', String(page));
      url.searchParams.set('size', String(size));
      url.searchParams.set('is_active', String(criteria.activeOnly));
      if (criteria.query.length > 0) {
        url.searchParams.set('q', criteria.query);
      }

      const payload = await fetchJsonWithRetry(url.toString(), {
        headers: SAM_HEADERS,
        maxRetries: this.maxRetries,
        retryDelayMs: this.retryDelayMs,
      });

      const { opportunities } = parseSamSearchResponse(payload);
      if (opportunities.length === 0) {
        break;
      }

      collected.push(...opportunities);
      if (opportunities.length < size) {
        break;
      }

      page += 1;
    }

    const sliced = collected.slice(0, criteria.maxItems);
    if (!criteria.includeDetails) {
      return sliced;
    }

    const enriched: NormalizedOpportunity[] = [];
    for (const opp of sliced) {
      try {
        const detail = await this.getOpportunityById(opp.opportunityId);
        if (detail) {
          enriched.push({
            ...opp,
            naicsCodes: detail.naicsCodes,
            classificationCode: detail.classificationCode,
            pointOfContact: detail.pointOfContact,
            description: detail.description ?? opp.description,
          });
          continue;
        }
      } catch {
        // Keep base search record if detail endpoint fails transiently
      }
      enriched.push(opp);
    }

    return enriched;
  }

  async getOpportunityById(opportunityId: string): Promise<NormalizedOpportunity | null> {
    const sanitized = opportunityId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitized.length === 0) {
      return null;
    }

    const url = `${this.detailBaseUrl}/${encodeURIComponent(sanitized)}`;

    try {
      const payload = await fetchJsonWithRetry(url, {
        headers: SAM_HEADERS,
        maxRetries: this.maxRetries,
        retryDelayMs: this.retryDelayMs,
      });

      const detail = parseSamDetailResponse(payload);
      if (!detail.opportunityId) {
        return null;
      }

      return {
        opportunityId: detail.opportunityId,
        solicitationNumber: detail.solicitationNumber ?? null,
        title: detail.title ?? sanitized,
        noticeTypeCode: null,
        noticeType: null,
        department: null,
        agency: null,
        office: null,
        isActive: true,
        isCanceled: false,
        publishedDate: detail.publishedDate ?? null,
        modifiedDate: detail.modifiedDate ?? null,
        responseDeadline: detail.responseDeadline ?? null,
        naicsCodes: detail.naicsCodes ?? [],
        classificationCode: detail.classificationCode ?? null,
        pointOfContact: detail.pointOfContact ?? [],
        description: detail.description ?? null,
        samUrl: detail.samUrl ?? `https://sam.gov/opp/${sanitized}/view`,
      };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('HTTP 404')) {
        return null;
      }
      throw err;
    }
  }
}
