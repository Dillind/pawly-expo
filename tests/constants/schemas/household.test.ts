import { readFileSync } from 'node:fs';
import path from 'node:path';

import { householdHandleSchema, RESERVED_HANDLES } from '@/constants/schemas/household';

const accepts = (handle: string) => householdHandleSchema.safeParse({ handle }).success;

describe('householdHandleSchema', () => {
  it('accepts a hyphenated handle', () => {
    expect(accepts('kathys-house')).toBe(true);
    expect(accepts('bailey')).toBe(true);
    expect(accepts('house-42-b')).toBe(true);
  });

  it('rejects a hyphen that is not between two alphanumerics', () => {
    expect(accepts('kathys-house-')).toBe(false);
    expect(accepts('kathys--house')).toBe(false);
    expect(accepts('-kathys')).toBe(false);
  });

  it('rejects an underscore, so one name has one spelling', () => {
    expect(accepts('kathys_house')).toBe(false);
  });

  it('rejects anything that does not start with a letter', () => {
    expect(accepts('1kathys')).toBe(false);
  });

  it('holds the length between 3 and 20', () => {
    expect(accepts('ab')).toBe(false);
    expect(accepts('abc')).toBe(true);
    expect(accepts('a'.repeat(20))).toBe(true);
    expect(accepts('a'.repeat(21))).toBe(false);
  });

  it('lowercases rather than rejects', () => {
    expect(householdHandleSchema.parse({ handle: 'Kathys-House' })).toEqual({
      handle: 'kathys-house'
    });
  });

  it('rejects every reserved word', () => {
    RESERVED_HANDLES.forEach((reserved) => expect(accepts(reserved)).toBe(false));
  });
});

describe('RESERVED_HANDLES', () => {
  // The drift guard. A word in one list and not the other passes validation,
  // comes back unavailable, and the screen reports it as taken -- which is not
  // true, and which no other test would notice.
  it('matches the households_handle_not_reserved constraint exactly', () => {
    const migration = readFileSync(
      path.join(
        __dirname,
        '../../../supabase/migrations/20260911090000_a_household_has_a_handle_and_can_be_listed.sql'
      ),
      'utf8'
    );

    const constraint = migration.match(
      /households_handle_not_reserved[\s\S]*?handle not in \(([^)]*)\)/
    );

    expect(constraint).not.toBeNull();

    const fromSql = constraint![1]
      .split(',')
      .map((word) => word.trim().replace(/^'|'$/g, ''))
      .filter(Boolean);

    expect([...fromSql].sort()).toEqual([...RESERVED_HANDLES].sort());
  });
});
