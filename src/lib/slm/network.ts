/**
 * Chakra-Nano neural network: a multi-task fastText-style model.
 *
 *   text ──► hashed n-gram ids ──► EmbeddingBag(B × D, mean) ──► h ∈ R^D ──┬─► intent head   (softmax)
 *                                                                          ├─► category head (softmax)
 *                                                                          └─► severity head (softmax)
 *
 * Trained from scratch with SGD + linear LR decay. Heads share the embedding table, so
 * news language and voice-command language reinforce each other. Exported as int8 with
 * per-row scales (~0.5 MB), loads in a few ms and infers in well under 1 ms on a laptop CPU.
 */

export interface HeadSpec { name: string; labels: readonly string[] }

export interface Head { name: string; labels: string[]; W: Float32Array; b: Float32Array }

export interface NetworkConfig { buckets: number; dim: number }

export class Network {
  readonly buckets: number;
  readonly dim: number;
  E: Float32Array;
  heads: Map<string, Head> = new Map();

  constructor(cfg: NetworkConfig, heads: HeadSpec[], seed = 42) {
    this.buckets = cfg.buckets;
    this.dim = cfg.dim;
    this.E = new Float32Array(cfg.buckets * cfg.dim);
    const rnd = mulberry32(seed);
    const r = 1 / cfg.dim;
    for (let i = 0; i < this.E.length; i++) this.E[i] = (rnd() * 2 - 1) * r;
    for (const h of heads) {
      this.heads.set(h.name, { name: h.name, labels: [...h.labels], W: new Float32Array(cfg.dim * h.labels.length), b: new Float32Array(h.labels.length) });
    }
  }

  hidden(ids: Int32Array): Float32Array {
    const h = new Float32Array(this.dim);
    if (ids.length === 0) return h;
    for (const id of ids) {
      const off = id * this.dim;
      for (let d = 0; d < this.dim; d++) h[d] += this.E[off + d];
    }
    for (let d = 0; d < this.dim; d++) h[d] /= ids.length;
    return h;
  }

  logits(head: Head, h: Float32Array): Float32Array {
    const C = head.labels.length;
    const z = new Float32Array(C);
    for (let c = 0; c < C; c++) {
      let s = head.b[c];
      for (let d = 0; d < this.dim; d++) s += head.W[d * C + c] * h[d];
      z[c] = s;
    }
    return z;
  }

  predict(headName: string, ids: Int32Array): { label: string; prob: number; probs: Record<string, number> } {
    const head = this.heads.get(headName);
    if (!head) throw new Error(`Unknown head ${headName}`);
    const p = softmax(this.logits(head, this.hidden(ids)));
    let best = 0;
    for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
    const probs: Record<string, number> = {};
    head.labels.forEach((l, i) => (probs[l] = p[i]));
    return { label: head.labels[best], prob: p[best], probs };
  }

  /** One SGD step on a single example for one or more heads. Returns summed cross-entropy loss. */
  trainStep(ids: Int32Array, targets: Record<string, number>, lr: number): number {
    if (ids.length === 0) return 0;
    const h = this.hidden(ids);
    const dh = new Float32Array(this.dim);
    let loss = 0;
    for (const [name, y] of Object.entries(targets)) {
      const head = this.heads.get(name)!;
      const C = head.labels.length;
      const p = softmax(this.logits(head, h));
      loss += -Math.log(Math.max(p[y], 1e-9));
      for (let c = 0; c < C; c++) {
        const g = p[c] - (c === y ? 1 : 0);
        if (g === 0) continue;
        for (let d = 0; d < this.dim; d++) {
          dh[d] += head.W[d * C + c] * g;
          head.W[d * C + c] -= lr * g * h[d];
        }
        head.b[c] -= lr * g;
      }
    }
    const scale = lr / ids.length;
    for (const id of ids) {
      const off = id * this.dim;
      for (let d = 0; d < this.dim; d++) this.E[off + d] -= scale * dh[d];
    }
    return loss;
  }

  /** Serialize to compact int8 + per-row-scale JSON. Unused buckets are zeroed (they carry only init noise). */
  export(usedBuckets: Set<number>, meta: Record<string, unknown>): SerializedNetwork {
    const D = this.dim;
    const q = new Int8Array(this.buckets * D);
    const scales = new Float32Array(this.buckets);
    for (let b = 0; b < this.buckets; b++) {
      if (!usedBuckets.has(b)) continue;
      let m = 0;
      for (let d = 0; d < D; d++) m = Math.max(m, Math.abs(this.E[b * D + d]));
      const s = m / 127 || 1e-8;
      scales[b] = s;
      for (let d = 0; d < D; d++) q[b * D + d] = Math.round(this.E[b * D + d] / s);
    }
    const heads = [...this.heads.values()].map((h) => ({ name: h.name, labels: h.labels, W: Array.from(h.W, (x) => +x.toFixed(5)), b: Array.from(h.b, (x) => +x.toFixed(5)) }));
    return {
      format: "chakra-nano/v1",
      buckets: this.buckets,
      dim: D,
      E_int8_b64: Buffer.from(q.buffer).toString("base64"),
      E_scales_b64: Buffer.from(scales.buffer).toString("base64"),
      heads,
      meta,
    };
  }

  static load(s: SerializedNetwork): Network {
    const net = new Network({ buckets: s.buckets, dim: s.dim }, s.heads.map((h) => ({ name: h.name, labels: h.labels })), 1);
    const q = b64ToBytes(s.E_int8_b64);
    const scales = new Float32Array(b64ToBytes(s.E_scales_b64).buffer);
    const i8 = new Int8Array(q.buffer, q.byteOffset, q.byteLength);
    for (let b = 0; b < s.buckets; b++) {
      const sc = scales[b];
      for (let d = 0; d < s.dim; d++) net.E[b * s.dim + d] = i8[b * s.dim + d] * sc;
    }
    for (const h of s.heads) {
      const head = net.heads.get(h.name)!;
      head.W.set(h.W);
      head.b.set(h.b);
    }
    return net;
  }
}

export interface SerializedNetwork {
  format: "chakra-nano/v1";
  buckets: number;
  dim: number;
  E_int8_b64: string;
  E_scales_b64: string;
  heads: { name: string; labels: string[]; W: number[]; b: number[] }[];
  meta: Record<string, unknown>;
}

export function softmax(z: Float32Array): Float32Array {
  let m = -Infinity;
  for (const v of z) m = Math.max(m, v);
  const out = new Float32Array(z.length);
  let s = 0;
  for (let i = 0; i < z.length; i++) { out[i] = Math.exp(z[i] - m); s += out[i]; }
  for (let i = 0; i < z.length; i++) out[i] /= s;
  return out;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function b64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    // copy into an aligned buffer for Float32Array views
    const out = new Uint8Array(buf.length);
    out.set(buf);
    return out;
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
