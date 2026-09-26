// Loudness as broadcasters measure it (ITU-R BS.1770): the signal is weighted towards the frequencies the ear favours
// (a high shelf, then a high-pass that ignores rumble), cut into 400 ms blocks overlapping by 75%, and averaged over
// the blocks loud enough to count: above -70 LUFS, and no more than 10 LU below the average of those.

// The two weighting filters, designed for any sample rate as libebur128 (the reference implementation) does it; at
// 48 kHz they give the coefficients printed in the standard.
function kWeighting(sr) {
  let K = Math.tan((Math.PI * 1681.974450955533) / sr), Q = 0.7071752369554196;
  const Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416), a0 = 1 + K / Q + K * K;
  const shelf = { b: [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0], a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] };
  K = Math.tan((Math.PI * 38.13547087613982) / sr); Q = 0.5003270373253953;
  const d = 1 + K / Q + K * K, hp = { b: [1, -2, 1], a: [(2 * (K * K - 1)) / d, (1 - K / Q + K * K) / d] };
  return [shelf, hp];
}
const run = ({ b, a }, x) => {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
};

export function lufs({ L, R }, sr) {
  const [shelf, hp] = kWeighting(sr);
  const weigh = (x) => run(hp, run(shelf, x)).map((w) => w * w);
  const wL = weigh(L), wR = weigh(R), block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr);
  const z = [];
  for (let s = 0; s + block <= wL.length; s += hop) {
    let e = 0;
    for (let i = s; i < s + block; i++) e += wL[i] + wR[i];
    z.push(e / block);
  }
  const loud = (ms) => -0.691 + 10 * Math.log10(ms);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const gated = z.filter((e) => loud(e) > -70);
  if (!gated.length) return -Infinity;
  const floor = loud(mean(gated)) - 10;
  return loud(mean(gated.filter((e) => loud(e) > floor)));
}

export function peakDb({ L, R }) {
  let p = 0;
  for (let i = 0; i < L.length; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i]));
  return 20 * Math.log10(p + 1e-12);
}
