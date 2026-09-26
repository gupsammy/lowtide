// Renders a track's opening off the main thread. The sample kit loads once per worker.
import { renderOpening } from './render.js';
import { loadBank } from './sampler.js';

const bank = loadBank((file) => fetch(new URL(`../samples/${file}`, import.meta.url)).then((r) => {
  if (!r.ok) throw new Error(`${file}: ${r.status}`);
  return r.arrayBuffer();
}));

self.onmessage = async ({ data: { id, plan, seconds, sr } }) => {
  try {
    const b = await bank, t0 = performance.now(), { L, R } = renderOpening(plan, seconds, sr, b);
    self.postMessage({ id, L, R, ms: performance.now() - t0 }, [L.buffer, R.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  }
};
