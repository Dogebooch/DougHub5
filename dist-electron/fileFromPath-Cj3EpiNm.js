import { promises as h, createReadStream as u } from "fs";
import { basename as m } from "path";
import { g as p, F as w } from "./main-CIlhiJQ2.js";
import { i as v } from "./main-CIlhiJQ2.js";
/*! node-domexception. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
if (!globalThis.DOMException)
  try {
    const { MessageChannel: e } = require("worker_threads"), t = new e().port1, r = new ArrayBuffer();
    t.postMessage(r, [r, r]);
  } catch (e) {
    e.constructor.name === "DOMException" && (globalThis.DOMException = e.constructor);
  }
var b = globalThis.DOMException;
const M = /* @__PURE__ */ p(b), y = (e) => Object.prototype.toString.call(e).slice(8, -1).toLowerCase();
function g(e) {
  if (y(e) !== "object")
    return !1;
  const t = Object.getPrototypeOf(e);
  return t == null ? !0 : (t.constructor && t.constructor.toString()) === Object.toString();
}
var f = function(e, t, r, i, o) {
  if (i === "m") throw new TypeError("Private method is not writable");
  if (i === "a" && !o) throw new TypeError("Private accessor was defined without a setter");
  if (typeof t == "function" ? e !== t || !o : !t.has(e)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return i === "a" ? o.call(e, r) : o ? o.value = r : t.set(e, r), r;
}, s = function(e, t, r, i) {
  if (r === "a" && !i) throw new TypeError("Private accessor was defined without a getter");
  if (typeof t == "function" ? e !== t || !i : !t.has(e)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return r === "m" ? i : r === "a" ? i.call(e) : i ? i.value : t.get(e);
}, a, c;
const F = "The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.";
class d {
  constructor(t) {
    a.set(this, void 0), c.set(this, void 0), f(this, a, t.path, "f"), f(this, c, t.start || 0, "f"), this.name = m(s(this, a, "f")), this.size = t.size, this.lastModified = t.lastModified;
  }
  slice(t, r) {
    return new d({
      path: s(this, a, "f"),
      lastModified: this.lastModified,
      size: r - t,
      start: t
    });
  }
  async *stream() {
    const { mtimeMs: t } = await h.stat(s(this, a, "f"));
    if (t > this.lastModified)
      throw new M(F, "NotReadableError");
    this.size && (yield* u(s(this, a, "f"), {
      start: s(this, c, "f"),
      end: s(this, c, "f") + this.size - 1
    }));
  }
  get [(a = /* @__PURE__ */ new WeakMap(), c = /* @__PURE__ */ new WeakMap(), Symbol.toStringTag)]() {
    return "File";
  }
}
function E(e, { mtimeMs: t, size: r }, i, o = {}) {
  let n;
  g(i) ? [o, n] = [i, void 0] : n = i;
  const l = new d({ path: e, size: r, lastModified: t });
  return n || (n = l.name), new w([l], n, {
    ...o,
    lastModified: l.lastModified
  });
}
async function S(e, t, r) {
  const i = await h.stat(e);
  return E(e, i, t, r);
}
export {
  S as fileFromPath,
  v as isFile
};
