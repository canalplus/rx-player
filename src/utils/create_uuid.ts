import globalScope from "./global_scope";
import getMonotonicTimeStamp from "./monotonic_timestamp";

/**
 * Create and return a Universally Unique IDentifier (UUID) as defined by
 * RFC4122.
 * Depending on browser API availability, we may be generating an approximation
 * of what the RFC indicates instead.
 * @returns {string}
 */
export default function createUuid(): string {
  if (typeof globalScope.crypto?.randomUUID === "function") {
    return globalScope.crypto.randomUUID();
  }
  let ts1 = new Date().getTime();
  let ts2 = getMonotonicTimeStamp();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = Math.random() * 16;
    if (ts1 > 0) {
      r = (ts1 + r) % 16 | 0;
      ts1 = Math.floor(ts1 / 16);
    } else {
      r = (ts2 + r) % 16 | 0;
      ts2 = Math.floor(ts2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
