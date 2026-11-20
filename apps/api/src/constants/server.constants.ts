// A hop count, never `true`: `true` trusts a client-supplied X-Forwarded-For
// and lets anyone bypass the auth rate limits.
export function parseTrustProxyHops(value: string | undefined): number {
  if (value === undefined || value === '') return 0;
  if (!/^\d+$/.test(value)) {
    throw new Error(
      `TRUST_PROXY_HOPS must be a whole number of proxies, got "${value}"`
    );
  }
  return Number(value);
}

export const TRUST_PROXY_HOPS = parseTrustProxyHops(
  process.env.TRUST_PROXY_HOPS
);
