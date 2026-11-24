import type { NormalizedOpportunity, PointOfContact } from './opportunity-schema.js';

export function toIsoDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export function cleanDescription(raw: string | null | undefined, maxLen = 1200): string | null {
  if (!raw) {
    return null;
  }
  const cleaned = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length === 0) {
    return null;
  }
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
}

interface SamOrgNode {
  level?: number;
  name?: string;
}

interface SamSearchResultRaw {
  _id?: string;
  title?: string;
  solicitationNumber?: string | null;
  isActive?: boolean;
  isCanceled?: boolean;
  publishDate?: string | null;
  modifiedDate?: string | null;
  responseDate?: string | null;
  type?: { code?: string; value?: string } | null;
  descriptions?: Array<{ content?: string }> | null;
  organizationHierarchy?: SamOrgNode[] | null;
}

/**
 * Parses SAM.gov keyless search API (`_embedded.results`) into NormalizedOpportunity[].
 */
export function parseSamSearchResponse(payload: unknown): {
  totalElements: number;
  opportunities: NormalizedOpportunity[];
} {
  const root = payload as {
    _embedded?: { results?: SamSearchResultRaw[] };
    page?: { totalElements?: number };
  } | null;

  const totalElements = root?.page?.totalElements ?? 0;
  const results = root?._embedded?.results;
  if (!Array.isArray(results)) {
    return { totalElements, opportunities: [] };
  }

  const opportunities: NormalizedOpportunity[] = [];

  for (const item of results) {
    if (!item._id || !item.title) {
      continue;
    }

    const orgs = Array.isArray(item.organizationHierarchy) ? item.organizationHierarchy : [];
    const department = orgs.find((o) => o.level === 1)?.name?.trim() || orgs[0]?.name?.trim() || null;
    const agency = orgs.find((o) => o.level === 2)?.name?.trim() || null;
    const office = orgs.length > 0 ? (orgs[orgs.length - 1]?.name?.trim() || null) : null;

    opportunities.push({
      opportunityId: item._id,
      solicitationNumber: item.solicitationNumber?.trim() || null,
      title: item.title.trim(),
      noticeTypeCode: item.type?.code?.trim() || null,
      noticeType: item.type?.value?.trim() || null,
      department,
      agency,
      office,
      isActive: Boolean(item.isActive),
      isCanceled: Boolean(item.isCanceled),
      publishedDate: toIsoDate(item.publishDate),
      modifiedDate: toIsoDate(item.modifiedDate),
      responseDeadline: toIsoDate(item.responseDate),
      naicsCodes: [],
      classificationCode: null,
      pointOfContact: [],
      description: cleanDescription(item.descriptions?.[0]?.content),
      samUrl: `https://sam.gov/opp/${item._id}/view`,
    });
  }

  return { totalElements, opportunities };
}

interface SamDetailRaw {
  opportunityId?: string;
  id?: string;
  postedDate?: string | null;
  modifiedDate?: string | null;
  cancelled?: boolean;
  archived?: boolean;
  description?: Array<{ body?: string }> | string | null;
  data2?: {
    title?: string;
    solicitationNumber?: string | null;
    type?: string | null;
    classificationCode?: string | null;
    naics?: Array<{ code?: string[] }> | null;
    pointOfContact?: Array<{
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
      type?: string | null;
    }> | null;
    solicitation?: {
      deadlines?: { response?: string | null } | null;
    } | null;
  } | null;
}

/**
 * Parses SAM.gov opportunity detail endpoint (`/opps/v2/opportunities/{id}`).
 */
export function parseSamDetailResponse(payload: unknown): Partial<NormalizedOpportunity> {
  const raw = payload as SamDetailRaw | null;
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const naicsSet = new Set<string>();
  for (const entry of raw.data2?.naics ?? []) {
    for (const code of entry.code ?? []) {
      if (code && code.trim().length > 0) {
        naicsSet.add(code.trim());
      }
    }
  }

  const contacts: PointOfContact[] = (raw.data2?.pointOfContact ?? []).map((poc) => ({
    fullName: poc.fullName?.trim() || null,
    email: poc.email?.trim() || null,
    phone: poc.phone?.trim() || null,
    type: poc.type?.trim() || null,
  }));

  const rawDesc = Array.isArray(raw.description)
    ? raw.description[0]?.body
    : typeof raw.description === 'string'
      ? raw.description
      : null;

  const opportunityId = raw.opportunityId ?? raw.id;

  return {
    ...(opportunityId ? { opportunityId, samUrl: `https://sam.gov/opp/${opportunityId}/view` } : {}),
    ...(raw.data2?.title ? { title: raw.data2.title.trim() } : {}),
    ...(raw.data2?.solicitationNumber !== undefined
      ? { solicitationNumber: raw.data2.solicitationNumber?.trim() || null }
      : {}),
    ...(raw.data2?.classificationCode !== undefined
      ? { classificationCode: raw.data2.classificationCode?.trim() || null }
      : {}),
    naicsCodes: Array.from(naicsSet),
    pointOfContact: contacts,
    ...(rawDesc ? { description: cleanDescription(rawDesc) } : {}),
    ...(raw.postedDate ? { publishedDate: toIsoDate(raw.postedDate) } : {}),
    ...(raw.modifiedDate ? { modifiedDate: toIsoDate(raw.modifiedDate) } : {}),
    ...(raw.data2?.solicitation?.deadlines?.response
      ? { responseDeadline: toIsoDate(raw.data2.solicitation.deadlines.response) }
      : {}),
  };
}
