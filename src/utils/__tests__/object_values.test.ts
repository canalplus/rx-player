import { describe, it, expect } from "vitest";
import { objectValues } from "../object_values";

describe("utils - objectValues", () => {
  it("should return the same thing than Object.values", () => {
    expect(objectValues({})).toEqual([]);

    const obj = { a: 4, b: 6, c: /a/, d: "toto" };
    expect(objectValues(obj)).toEqual([obj.a, obj.b, obj.c, obj.d]);
  });
});
