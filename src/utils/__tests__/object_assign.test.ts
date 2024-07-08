import { describe, it, expect } from "vitest";
import objectAssign from "../object_assign";

describe("utils - objectAssign", () => {
  it("should throw if target is not an object", () => {
    expect(() => {
      objectAssign(null as unknown as object, {});
    }).toThrow("Cannot convert undefined or null to object");
    expect(() => {
      objectAssign(undefined as unknown as object, {});
    }).toThrow("Cannot convert undefined or null to object");
  });

  it("should update the first argument and return it", () => {
    const obj = {};
    expect(objectAssign(obj)).toBe(obj);
    expect(obj).toEqual({});

    expect(objectAssign(obj, { a: 4, c: { d: "toto" } })).toBe(obj);
    expect(obj).toEqual({ a: 4, c: { d: "toto" } });

    expect(objectAssign(obj, { f: /a/ })).toBe(obj);
    expect(obj).toEqual({ a: 4, c: { d: "toto" }, f: /a/ });

    expect(objectAssign(obj, { g: 18 }, { h: 32 }, { i: 4 })).toBe(obj);
    expect(obj).toEqual({ a: 4, c: { d: "toto" }, f: /a/, g: 18, h: 32, i: 4 });
  });

  it("should overwrite properties existing in both sources and targets by the latest source", () => {
    const obj = { a: 4, c: { d: "toto" } };

    expect(objectAssign(obj, { a: 78 })).toBe(obj);
    expect(obj).toEqual({ a: 78, c: { d: "toto" } });

    expect(objectAssign(obj, { c: { d: 55 } }, { c: { d: 85 } })).toBe(obj);
    expect(obj).toEqual({ a: 78, c: { d: 85 } });
  });

  it("types definition should be correct", () => {
    const obj = { a: 4, b: 5 };
    interface Shape1 {
      a: number;
      b: number;
    }
    interface Shape2 {
      a: string;
      b: number;
    }

    const mergedObj = objectAssign(obj, { a: "foo" });
    // the intention in this test is to check typescript definitions
    // the test would always pass in javascript, but it will show
    // a typescript error if the typedefinition are incorrects.

    // @ts-expect-error result is not of Shape1, should show an error
    expect(mergedObj).toMatchObject<Shape1>({ a: "foo", b: 5 });
    expect(mergedObj).toMatchObject<Shape2>({ a: "foo", b: 5 });
  });
});
