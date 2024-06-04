import { describe, it, expect } from "vitest";
import areInitializationValuesCompatible from "../are_init_values_compatible";

describe("decrypt - utils - areInitializationValuesCompatible", () => {
  it("should return false if either initialization data is empty", () => {
    const test1 = areInitializationValuesCompatible([], []);
    const test2 = areInitializationValuesCompatible(
      [],
      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
      ],
    );
    const test3 = areInitializationValuesCompatible(
      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
      ],
      [],
    );
    expect(test1).toEqual(false);
    expect(test2).toEqual(false);
    expect(test3).toEqual(false);
  });

  it("should return true for equivalent initialization data", () => {
    const test1 = areInitializationValuesCompatible(
      [{ systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) }],
      [{ systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) }],
    );
    const test2 = areInitializationValuesCompatible(
      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
      ],

      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
      ],
    );
    expect(test1).toEqual(true);
    expect(test2).toEqual(true);
  });

  it("should return true if the first initializationData is contained in the second", () => {
    const test1 = areInitializationValuesCompatible(
      [
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],

      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],
    );
    expect(test1).toEqual(true);
  });

  it("should return true if the second initializationData is contained in the first", () => {
    const test1 = areInitializationValuesCompatible(
      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],

      [
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],
    );
    expect(test1).toEqual(true);
  });

  it("should return false if initializationData systemIds are different", () => {
    const test1 = areInitializationValuesCompatible(
      [
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],

      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "BB", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "CC", hash: 18, data: new Uint8Array([2, 2, 2]) },
        { systemId: "DD", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],
    );
    expect(test1).toEqual(false);
  });

  it("should return false if at least one hash is different", () => {
    const test1 = areInitializationValuesCompatible(
      [
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],

      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE", hash: 19, data: new Uint8Array([4, 4, 2]) },
      ],
    );
    const test2 = areInitializationValuesCompatible(
      [
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],

      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 25, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],
    );
    expect(test1).toEqual(false);
    expect(test2).toEqual(false);
  });

  it("should return false if init data are different", () => {
    const test1 = areInitializationValuesCompatible(
      [
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],

      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 27, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 3, 3]) },
      ],
    );
    const test2 = areInitializationValuesCompatible(
      [
        { systemId: "F054", hash: 25, data: new Uint8Array([2, 9, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],

      [
        { systemId: "AA", hash: 15, data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054", hash: 25, data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA", hash: 18, data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE", hash: 18, data: new Uint8Array([4, 4, 2]) },
      ],
    );
    expect(test1).toEqual(false);
    expect(test2).toEqual(false);
  });
});
