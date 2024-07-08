import { describe, it, expect } from "vitest";
import hashBuffer from "../hash_buffer";

const arrayb1 = new Uint8Array([
  5, 5, 6, 87, 87, 76, 64, 35, 35, 68, 41, 14, 87, 1, 35, 87, 255, 87, 12, 87, 8,
]);
const arrayb2 = new Uint8Array([
  7, 5, 6, 87, 87, 76, 64, 35, 35, 68, 41, 14, 87, 1, 35, 87, 255, 87, 12, 87, 8,
]);
const arrayb3 = new Uint8Array([
  8, 5, 6, 87, 87, 76, 64, 35, 35, 68, 41, 14, 87, 1, 35, 87, 255, 87, 12, 87, 8,
]);

describe("utils - hashBuffer", () => {
  it("should always hash the same data the same way", () => {
    expect(hashBuffer(arrayb1.slice())).toBe(hashBuffer(arrayb1.slice()));
    expect(hashBuffer(arrayb2.slice())).toBe(hashBuffer(arrayb2.slice()));
    expect(hashBuffer(arrayb3.slice())).toBe(hashBuffer(arrayb3.slice()));
  });

  it("should avoid collisions", () => {
    // Might be better to test on gazillions of different buffers. I know
    const arrayb1Clone = arrayb1.slice();
    expect(hashBuffer(arrayb1Clone)).not.toBe(hashBuffer(arrayb2.slice()));

    expect(hashBuffer(arrayb1Clone)).not.toBe(hashBuffer(arrayb3.slice()));
  });
});
