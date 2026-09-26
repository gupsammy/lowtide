// Renders tracks off the main thread. The sample kit loads once per worker.
//   { id, plan, sr, seconds }   the track's first seconds, in one message: { id, L, R, ms }
//   { id, plan, sr, full: true } the whole track, a message per section as it renders, so playback can start at once:
//                                { id, offset, total, L, R } …, then { id, done: true, ms }
//   { cancel: id }               stop a whole-track render at its next section
import { renderOpening, renderTrack } from './render.js';
import { loadBank } from './sampler.js';

const bank = loadBank((file) => fetch(new URL(`../samples/${file}`, import.meta.url)).then((r) => {
  if (!r.ok) throw new Error(`${file}: ${r.status}`);
  return r.arrayBuffer();
}));
const cancelled = new Set();

self.onmessage = async ({ data }) => {
  if (data.cancel) { cancelled.add(data.cancel); return; }
  const { id, plan, seconds, sr, full } = data;
  try {
    const b = await bank, t0 = performance.now();
    if (!full) {
      const { L, R } = renderOpening(plan, seconds, sr, b);
      self.postMessage({ id, L, R, ms: performance.now() - t0 }, [L.buffer, R.buffer]);
      return;
    }
    for (const c of renderTrack(plan, sr, b)) {
      self.postMessage({ id, offset: c.offset, total: c.total, L: c.L, R: c.R }, [c.L.buffer, c.R.buffer]);
      await new Promise((r) => setTimeout(r)); // lets a cancel in before the next section renders
      if (cancelled.delete(id)) return;
    }
    self.postMessage({ id, done: true, ms: performance.now() - t0 });
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  }
};
