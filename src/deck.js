// The deck: everything that must hear a track as one unbroken stream. Sections arrive as three streams: dry, a
// reverb send and an echo send. The deck adds the echo and the room, plays it all through a worn tape machine and a
// record player, then glues it and catches the peaks. Every stage runs sample by sample and every wobble and crackle
// is tied to the absolute sample count, so any chunk sizes fed in order give exactly the result of one pass: the
// radio can feed it section by section.
import { TAU, rng, Biquad, hashString } from './synth/dsp.js';

// A one-pole filter pair (high-pass then low-pass), cheap enough for the echo loop.
function bandOnePole(lo, hi, sr) {
  const ah = Math.exp((-TAU * lo) / sr), al = Math.exp((-TAU * hi) / sr);
  let hx = 0, hy = 0, ly = 0;
  return (x) => { hy = ah * (hy + x - hx); hx = x; ly = (1 - al) * hy + al * ly; return ly; };
}

// Four-point cubic (Hermite) read between samples, for the tape's moving read head.
function hermite(a, b, c, d, f) {
  const c1 = 0.5 * (c - a), c2 = a - 2.5 * b + 2 * c - 0.5 * d, c3 = 0.5 * (d - a) + 1.5 * (b - c);
  return ((c3 * f + c2) * f + c1) * f + b;
}

// o: { bpm, tape 0–1, seed, space (see plan.js), ocean: Float32Array at sr or null, vinylBoostUntil: seconds,
//      gain: level into the glue stage }. Stages can be switched off for tests with o.only = ['wow', ...].
export function createDeck(o, sr) {
  const S = o.space, tape = o.tape, on = (stage) => !o.only || o.only.includes(stage);
  let pos = 0; // samples processed so far: the deck's clock

  // Echo: ping-pong. Fresh sound enters the left line; each line's output feeds the other, filtered and at the
  // feedback level, so the repeats alternate sides and darken as they fade.
  const E = S.echo, D = E ? Math.max(1, Math.round(((E.beats * 60) / o.bpm) * sr)) : 1;
  const eL = new Float32Array(D), eR = new Float32Array(D), fbL = bandOnePole(250, 3000, sr), fbR = bandOnePole(250, 3000, sr);
  let ew = 0;

  // Reverb: eight delay lines mixed by a Householder matrix (lossless: every line feeds every other), each line
  // losing just enough per trip to fall 60 dB in T60 seconds, with a one-pole low-pass for air absorbing the highs.
  const lens = [29.7, 37.1, 41.1, 43.7, 53.3, 59.9, 67.1, 73.3].map((ms) => Math.max(2, Math.round((ms * S.size * sr) / 1000)));
  const lines = lens.map((n) => new Float32Array(n)), idx = new Int32Array(8), z = new Float64Array(8), y = new Float64Array(8);
  const loss = lens.map((n) => Math.pow(10, (-3 * n) / (S.t60 * sr)));
  const P = Math.max(1, Math.round((S.predelayMs * sr) / 1000)), preL = new Float32Array(P), preR = new Float32Array(P);
  const vhL = new Biquad('hp', 150, 0.7, 0, sr), vhR = new Biquad('hp', 150, 0.7, 0, sr);
  let pw = 0;

  // Texture: the ocean drum, looped with a long crossfade so the seam never shows; the right side reads half a loop
  // away so the bed is wide.
  let bed = null;
  if (o.ocean && S.texture) {
    const x = o.ocean, X = Math.round(1.5 * sr), N = x.length - X;
    bed = new Float32Array(N);
    for (let i = 0; i < N; i++) bed[i] = i < X ? x[i] * (i / X) + x[N + i] * (1 - i / X) : x[i];
  }
  const bedLpL = new Biquad('lp', 4500, 0.7, 0, sr), bedLpR = new Biquad('lp', 4500, 0.7, 0, sr);

  // Tape: head bump, saturation (asymmetric, so it adds even harmonics like tape does; a DC blocker follows), wow,
  // flutter and slow drift through one moving read head, the top end rolled off, a little hiss.
  const bumpL = new Biquad('peak', 100, 0.9, S.bumpDb, sr), bumpR = new Biquad('peak', 100, 0.9, S.bumpDb, sr);
  const drive = 1 + 2 * tape, bias = 0.15 * tape, tb = Math.tanh(bias);
  let dcxL = 0, dcyL = 0, dcxR = 0, dcyR = 0;
  // depth in seconds for a pitch swing of c cents at f Hz: the read head's speed changes by the delay's slope
  const depth = (cents, f) => (cents * Math.LN2) / (1200 * TAU * f);
  const wow = on('wow') ? depth(S.wowCents, S.wowHz) : 0, flut = on('flutter') ? depth(S.flutterCents, S.flutterHz) : 0;
  const wr = rng(hashString(`wow:${o.seed}`)), wph = TAU * wr(), fph = TAU * wr();
  const drift = on('drift') ? [0.043, 0.071, 0.117].map((f) => ({ f: f * (0.8 + 0.4 * wr()), ph: TAU * wr(), a: depth(0.7, f) })) : [];
  const base = 0.012, W = Math.ceil(0.03 * sr), hdL = new Float32Array(W), hdR = new Float32Array(W);
  const rollL = new Biquad('lp', 12000 - 6000 * tape, 0.6, 0, sr), rollR = new Biquad('lp', 12000 - 6000 * tape, 0.6, 0, sr);

  // Grit: an old sampler's lower rate and fewer bits, on some tracks.
  const G = on('grit') ? S.grit : null, q = G ? Math.pow(2, G.bits - 1) : 0;
  let gph = 1, gL = 0, gR = 0;

  // Vinyl: crackle, rare pops, surface noise that swells once per turn of the record (33⅓ rpm), and rumble.
  const vr = rng(hashString(`vinyl:${o.seed}`)), V = on('vinyl') ? S.vinyl : 0;
  const crackleRate = (8 + 30 * V) / sr, popRate = (0.3 * V) / sr;
  const ckL = new Biquad('bp', 3200, 1.2, 0, sr), ckR = new Biquad('bp', 3200, 1.2, 0, sr), pop = new Biquad('lp', 300, 0.8, 0, sr);
  const surf = new Biquad('bp', 2200, 0.5, 0, sr), rumble = new Biquad('lp', 30, 0.7, 0, sr);
  const boostUntil = Math.round((o.vinylBoostUntil ?? 0) * sr), boostFade = Math.round(1.5 * sr);
  let hissPrev = 0, hiss = 0;

  // Glue: a stereo-linked RMS compressor, 2:1 above -18 dBFS, 15 ms attack, 200 ms release. Then a soft clip that
  // never lets a peak past -0.9 dBFS.
  const rmsA = Math.exp(-1 / (0.005 * sr)), atk = Math.exp(-1 / (0.015 * sr)), rel = Math.exp(-1 / (0.2 * sr));
  const ceil = Math.pow(10, -0.9 / 20), gain = o.gain ?? 1, makeup = Math.pow(10, 2 / 20);
  let pwr = 0, gdb = 0;

  return {
    // dry, verb, echo: { L, R } of equal length. Returns a new { L, R }.
    process(dry, verb, echo) {
      const n = dry.L.length, L = new Float32Array(n), R = new Float32Array(n);
      for (let i = 0; i < n; i++, pos++) {
        const t = pos / sr;
        // echo
        let xL = 0, xR = 0;
        if (E && on('echo')) {
          const oL = eL[ew], oR = eR[ew];
          eL[ew] = (echo.L[i] + echo.R[i]) * 0.5 + E.feedback * fbL(oR);
          eR[ew] = E.feedback * fbR(oL);
          ew = ew + 1 === D ? 0 : ew + 1;
          xL = oL; xR = oR;
        }
        // reverb
        let rL = 0, rR = 0;
        if (on('reverb')) {
          const inL = vhL.tick(verb.L[i] + 0.4 * xL), inR = vhR.tick(verb.R[i] + 0.4 * xR);
          const dl = preL[pw], dr = preR[pw];
          preL[pw] = inL; preR[pw] = inR; pw = pw + 1 === P ? 0 : pw + 1;
          let sum = 0;
          for (let k = 0; k < 8; k++) { y[k] = lines[k][idx[k]]; z[k] = (1 - S.damp) * y[k] + S.damp * z[k]; sum += z[k]; }
          const h = sum / 4; // Householder: x − (2/N)·Σx
          for (let k = 0; k < 8; k++) {
            lines[k][idx[k]] = loss[k] * (z[k] - h) + (k < 4 ? dl : dr) * (k % 2 ? -0.5 : 0.5);
            if (++idx[k] === lens[k]) idx[k] = 0;
          }
          rL = (y[1] + y[3] + y[5] + y[7]) * 0.5; rR = (y[0] + y[2] + y[4] + y[6]) * 0.5;
        }
        let mL = (dry.L[i] + xL + rL) * gain, mR = (dry.R[i] + xR + rR) * gain;
        if (bed && on('texture')) {
          mL += bedLpL.tick(bed[pos % bed.length]) * S.texture;
          mR += bedLpR.tick(bed[(pos + (bed.length >> 1)) % bed.length]) * S.texture;
        }
        // tape: bump, saturation, DC blocker
        if (on('saturation')) {
          mL = (Math.tanh(drive * bumpL.tick(mL) + bias) - tb) / drive;
          mR = (Math.tanh(drive * bumpR.tick(mR) + bias) - tb) / drive;
          dcyL = mL - dcxL + 0.9995 * dcyL; dcxL = mL; mL = dcyL;
          dcyR = mR - dcxR + 0.9995 * dcyR; dcxR = mR; mR = dcyR;
        }
        // the moving read head: wow, flutter, drift
        const hw = pos % W;
        hdL[hw] = mL; hdR[hw] = mR;
        if (wow || flut || drift.length) {
          let d = base + wow * Math.sin(TAU * S.wowHz * t + wph) + flut * Math.sin(TAU * S.flutterHz * t + fph);
          for (const s of drift) d += s.a * Math.sin(TAU * s.f * t + s.ph);
          const back = d * sr, k = Math.floor(back), f = back - k;
          const at = (m) => { const j = hw - m; return j < 0 ? j + W : j; };
          // samples before the deck started are silence
          const rd = (buf, m) => (pos - m < 0 ? 0 : buf[at(m)]);
          mL = hermite(rd(hdL, k + 2), rd(hdL, k + 1), rd(hdL, k), rd(hdL, k - 1), 1 - f);
          mR = hermite(rd(hdR, k + 2), rd(hdR, k + 1), rd(hdR, k), rd(hdR, k - 1), 1 - f);
        }
        if (on('rolloff')) { mL = rollL.tick(mL); mR = rollR.tick(mR); }
        // hiss: white noise without its lows
        const w = vr() * 2 - 1;
        hiss = 0.97 * (hiss + w - hissPrev); hissPrev = w;
        if (on('hiss')) { mL += hiss * 0.002 * tape; mR += hiss * 0.002 * tape; }
        // grit
        if (G) {
          gph += G.rate / sr;
          if (gph >= 1) { gph -= Math.floor(gph); gL = Math.round(mL * q) / q; gR = Math.round(mR * q) / q; }
          mL = gL; mR = gR;
        }
        // vinyl: the random numbers are drawn every sample whether used or not, so the sequence never depends on
        // where a chunk starts
        const u1 = vr(), u2 = vr(), u3 = vr(), u4 = vr();
        if (V) {
          const boost = pos < boostUntil ? 2 : pos < boostUntil + boostFade ? 2 - (pos - boostUntil) / boostFade : 1;
          const click = u1 < crackleRate ? (0.03 + 0.1 * u2) * (u3 < 0.5 ? -1 : 1) * V : 0;
          const thump = u4 < popRate ? 0.25 * V : 0;
          const p = pop.tick(thump), sn = surf.tick(u2 * 2 - 1) * 0.006 * V * (1 + 0.6 * Math.sin((TAU * t * 100) / 180));
          const rb = rumble.tick(u3 * 2 - 1) * 0.03 * V;
          mL += boost * (ckL.tick(click * (0.6 + 0.4 * u4)) + p + sn + rb);
          mR += boost * (ckR.tick(click * (1 - 0.4 * u4)) + p + sn + rb);
        }
        // glue and soft clip
        if (on('glue')) {
          pwr = rmsA * pwr + (1 - rmsA) * 0.5 * (mL * mL + mR * mR);
          const over = Math.max(0, 10 * Math.log10(pwr + 1e-12) + 18), want = -over * 0.5;
          gdb = want < gdb ? atk * gdb + (1 - atk) * want : rel * gdb + (1 - rel) * want;
          const g = Math.pow(10, gdb / 20) * makeup;
          mL *= g; mR *= g;
        }
        L[i] = ceil * Math.tanh(mL / ceil);
        R[i] = ceil * Math.tanh(mR / ceil);
      }
      return { L, R };
    },
  };
}
