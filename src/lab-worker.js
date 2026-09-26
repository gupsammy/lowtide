// Renders a track's opening off the main thread.
import { renderOpening } from './render.js';

self.onmessage = ({ data: { id, plan, seconds, sr } }) => {
  try {
    const t0 = performance.now(), { L, R } = renderOpening(plan, seconds, sr);
    self.postMessage({ id, L, R, ms: performance.now() - t0 }, [L.buffer, R.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  }
};
