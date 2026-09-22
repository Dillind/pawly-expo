import { makeRpcArgsNullable } from '../../scripts/db-types-patch';

describe('makeRpcArgsNullable', () => {
  it('widens a multi-line Args block', () => {
    const input = [
      '      log_feed: {',
      '        Args: {',
      '          target_notes?: string',
      '          target_pet_id: string',
      '        }'
    ].join('\n');

    expect(makeRpcArgsNullable(input)).toBe(
      [
        '      log_feed: {',
        '        Args: {',
        '          target_notes?: string | null',
        '          target_pet_id: string | null',
        '        }'
      ].join('\n')
    );
  });

  it('widens Args written on one line with the function', () => {
    expect(
      makeRpcArgsNullable(
        '      handle_available: { Args: { candidate: string }; Returns: boolean }'
      )
    ).toBe('      handle_available: { Args: { candidate: string | null }; Returns: boolean }');
  });

  it('widens every member of a one-line Args', () => {
    expect(makeRpcArgsNullable('        Args: { description?: string; title: string }')).toBe(
      '        Args: { description?: string | null; title: string | null }'
    );
  });

  it('is idempotent and leaves Args: never alone', () => {
    const once = makeRpcArgsNullable('      f: { Args: { a: string }; Returns: number }');
    expect(makeRpcArgsNullable(once)).toBe(once);
    expect(makeRpcArgsNullable('      g: { Args: never; Returns: Json }')).toBe(
      '      g: { Args: never; Returns: Json }'
    );
  });
});
