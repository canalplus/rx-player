import deepMerge from "../deep_merge";

describe("utils - deep_merge", () => {
  it("should return the first argument if no other arguments", () => {
    const obj1 = { a: 1 };
    expect(deepMerge(obj1)).toStrictEqual(obj1);
  });

  it("should concat if no common key is found", () => {
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };
    const result = { a: 1, b: 2 };
    expect(deepMerge(obj1, obj2)).toStrictEqual(result);
  });

  it("should override the 1st object with the second", () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };
    const result = { a: 2 };
    expect(deepMerge(obj1, obj2)).toStrictEqual(result);
  });

  it("should return a deeply merged object", () => {
    const obj1 = { a: { b: 1 } };
    const obj2 = { a: { c: 2 } };
    const result = { a: { b: 1, c: 2 } };
    expect(deepMerge(obj1, obj2)).toStrictEqual(result);
  });

  it("should be able to merge multiple objects", () => {
    const obj1 = { a: { b: 1 }, d: { e: 1 } };
    const obj2 = { a: { c: 2 } };
    const obj3 = { a: { f: 3 }, d: { g: 2 } };
    const result = {
      a: {
        b: 1,
        c: 2,
        f: 3,
      },
      d: {
        e: 1,
        g: 2,
      },
    };
    expect(deepMerge(obj1, obj2, obj3)).toStrictEqual(result);
  });
});
