import { describe, expect, it } from 'vitest';

import { matchSelector } from './selector.js';

describe('matchSelector', () => {
  it('should match wildcard', () => {
    expect(matchSelector('anyTool', '*')).toBe(true);
  });

  it('should match exact name', () => {
    expect(matchSelector('webSearch', 'webSearch')).toBe(true);
  });

  it('should not match different name', () => {
    expect(matchSelector('webSearch', 'databaseQuery')).toBe(false);
  });

  it('should match pattern with wildcard', () => {
    expect(matchSelector('database.users', 'database.*')).toBe(true);
  });

  it('should not match non-matching pattern', () => {
    expect(matchSelector('api.users', 'database.*')).toBe(false);
  });
});
