// WAV files as plain numbers. Read in plain JS rather than through the browser's decoder, so the page's workers and
// the Node tests turn the same bytes into the same samples.

// ArrayBuffer → { sr, data: Float32Array } (mono: channels are averaged). Reads 16-bit, 24-bit and 32-bit float PCM.
export function parseWav(buf) {
  const v = new DataView(buf);
  const tag = (o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV file');
  let o = 12, fmt = null;
  while (o + 8 <= v.byteLength) {
    const id = tag(o), size = v.getUint32(o + 4, true), body = o + 8;
    if (id === 'fmt ') fmt = { format: v.getUint16(body, true), channels: v.getUint16(body + 2, true), sr: v.getUint32(body + 4, true), bits: v.getUint16(body + 14, true) };
    if (id === 'data') {
      if (!fmt) throw new Error('WAV data before format');
      const { channels, bits, format } = fmt, bytes = bits / 8, frames = Math.floor(size / (bytes * channels));
      const read = format === 3 ? (p) => v.getFloat32(p, true)
        : bits === 16 ? (p) => v.getInt16(p, true) / 32768
        : bits === 24 ? (p) => ((v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16)) / 8388608)
        : null;
      if (!read) throw new Error(`unsupported WAV: format ${format}, ${bits} bits`);
      const data = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let s = 0;
        for (let c = 0; c < channels; c++) s += read(body + (i * channels + c) * bytes);
        data[i] = s / channels;
      }
      return { sr: fmt.sr, data };
    }
    o = body + size + (size & 1);
  }
  throw new Error('WAV has no data');
}

// Float32Array channels → 16-bit PCM WAV bytes.
export function writeWav(channels, sr) {
  const n = channels[0].length, ch = channels.length, buf = new ArrayBuffer(44 + n * ch * 2), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * ch * 2, true);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const x = Math.max(-1, Math.min(1, channels[c][i]));
    v.setInt16(44 + (i * ch + c) * 2, Math.round(x * 32767), true);
  }
  return buf;
}
