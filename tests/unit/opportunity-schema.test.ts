import { describe, expect, it } from 'vitest';
import { parseActorInput } from '../../src/domain/opportunity-schema.js';

describe('parseActorInput', () => {
  it('applies defaults for empty input', () => {
    expect(parseActorInput(undefined)).toEqual({
      query: '',
      noticeTypes: [],
      departments: [],
      activeOnly: true,
      includeDetails: false,
      maxItems: 50,
    });
  });

  it('validates date formats and maxItems bounds', () => {
    expect(() => parseActorInput({ publishedFrom: '2026/11/01' })).toThrow();
    expect(() => parseActorInput({ minDeadline: 'invalid' })).toThrow();
    expect(() => parseActorInput({ maxItems: 0 })).toThrow();
    expect(() => parseActorInput({ maxItems: 1001 })).toThrow();
  });
});
