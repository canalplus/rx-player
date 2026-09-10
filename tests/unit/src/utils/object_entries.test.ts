import { describe, it, expect } from "vitest";
import { objectEntries } from "../../../../src/utils/object_entries.ts";

describe("utils - objectEntries", () => {
  it("should return the same thing as Object.entries", () => {
    expect(objectEntries({})).toEqual([]);

    const obj = { a: 4, b: 6, c: /a/, d: "toto" };
    expect(objectEntries(obj)).toEqual([
      ["a", obj.a],
      ["b", obj.b],
      ["c", obj.c],
      ["d", obj.d],
    ]);
  });

  it("should only return own enumerable properties", () => {
    const parent = { inherited: 1 };
    const obj = Object.create(parent) as Record<string, number>;
    obj.enumerable = 2;
    Object.defineProperty(obj, "hidden", { value: 3, enumerable: false });

    expect(objectEntries(obj)).toEqual([["enumerable", 2]]);
  });
});
