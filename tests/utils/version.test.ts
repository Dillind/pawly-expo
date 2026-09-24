import { compareVersions, isNewerVersion, parseVersion } from '@/utils/version';

describe('parseVersion', () => {
  it('reads one to four numeric parts', () => {
    expect(parseVersion('1')).toEqual([1]);
    expect(parseVersion('1.0.1.2')).toEqual([1, 0, 1, 2]);
  });

  it('rejects anything else', () => {
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('1.0.1-beta')).toBeNull();
    expect(parseVersion('1.0.1.2.3')).toBeNull();
    expect(parseVersion('v1.0')).toBeNull();
  });
});

describe('compareVersions', () => {
  it('treats a missing part as zero', () => {
    expect(compareVersions('1.0.1', '1.0.1.0')).toBe(0);
  });

  it('puts an over-the-air release after its store build', () => {
    expect(compareVersions('1.0.1.1', '1.0.1')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.1.1')).toBe(-1);
  });

  it('compares numerically, not as text', () => {
    expect(isNewerVersion('1.0.10', '1.0.9')).toBe(true);
  });

  it('throws on a bad version', () => {
    expect(() => compareVersions('1.0.1-beta', '1.0.0')).toThrow('1.0.1-beta');
  });
});
