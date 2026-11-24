import type { ActorInput, NormalizedOpportunity } from './opportunity-schema.js';

/**
 * Deduplicates by opportunityId, applies noticeType/department/date/active filters,
 * sorts newest-first, and enforces maxItems.
 */
export function filterAndDeduplicateOpportunities(
  items: NormalizedOpportunity[],
  criteria: Pick<
    ActorInput,
    'noticeTypes' | 'departments' | 'activeOnly' | 'publishedFrom' | 'minDeadline' | 'maxItems'
  >,
): NormalizedOpportunity[] {
  const seen = new Set<string>();
  const noticeTypesLower = criteria.noticeTypes.map((n) => n.toLowerCase());
  const departmentsLower = criteria.departments.map((d) => d.toLowerCase());

  const filtered: NormalizedOpportunity[] = [];

  for (const opp of items) {
    if (seen.has(opp.opportunityId)) {
      continue;
    }
    seen.add(opp.opportunityId);

    if (criteria.activeOnly && (!opp.isActive || opp.isCanceled)) {
      continue;
    }

    if (noticeTypesLower.length > 0) {
      const code = (opp.noticeTypeCode ?? '').toLowerCase();
      const val = (opp.noticeType ?? '').toLowerCase();
      if (!noticeTypesLower.some((nt) => code === nt || val.includes(nt))) {
        continue;
      }
    }

    if (departmentsLower.length > 0) {
      const orgText = `${opp.department ?? ''} ${opp.agency ?? ''} ${opp.office ?? ''}`.toLowerCase();
      if (!departmentsLower.some((dept) => orgText.includes(dept))) {
        continue;
      }
    }

    if (criteria.publishedFrom !== undefined) {
      if (!opp.publishedDate || opp.publishedDate < criteria.publishedFrom) {
        continue;
      }
    }

    if (criteria.minDeadline !== undefined) {
      if (!opp.responseDeadline || opp.responseDeadline < criteria.minDeadline) {
        continue;
      }
    }

    filtered.push(opp);
  }

  filtered.sort((a, b) => {
    const dateA = a.modifiedDate ?? a.publishedDate;
    const dateB = b.modifiedDate ?? b.publishedDate;
    if (dateA === dateB) {
      return a.opportunityId.localeCompare(b.opportunityId);
    }
    if (dateA === null) {
      return 1;
    }
    if (dateB === null) {
      return -1;
    }
    return dateB.localeCompare(dateA);
  });

  return filtered.slice(0, criteria.maxItems);
}
