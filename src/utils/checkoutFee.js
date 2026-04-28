/** Match `computePlatformFeeSplit` on the API (PLATFORM_FEE_BPS). */
export function platformFeeFromTotal(totalUgx, feeBps) {
  const t = Number(totalUgx) || 0;
  const bps = Math.min(10_000, Math.max(0, Number(feeBps) || 0));
  if (t <= 0 || bps <= 0) {
    return { platformFeeUgx: 0, farmerPayoutUgx: round2(t) };
  }
  const fee = round2((t * bps) / 10_000);
  return { platformFeeUgx: fee, farmerPayoutUgx: round2(Math.max(0, t - fee)) };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
