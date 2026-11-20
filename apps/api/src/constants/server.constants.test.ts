import { describe, it, expect } from 'vitest';
import { parseTrustProxyHops } from './server.constants.js';

describe('parseTrustProxyHops', () => {
  it.each([undefined, ''])('defaults to 0 when unset (%j)', (value) => {
    expect(parseTrustProxyHops(value)).toBe(0);
  });

  it.each([
    ['0', 0],
    ['1', 1],
    ['2', 2],
  ])('parses %s as %i', (value, expected) => {
    expect(parseTrustProxyHops(value)).toBe(expected);
  });

  it.each(['true', '-1', '1.5', 'one', ' 1x'])(
    'throws on %j instead of guessing',
    (value) => {
      expect(() => parseTrustProxyHops(value)).toThrow(
        /TRUST_PROXY_HOPS must be a whole number/
      );
    }
  );
});
