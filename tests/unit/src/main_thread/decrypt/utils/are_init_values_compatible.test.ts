import { describe, it, expect } from "vitest";
import areInitializationValuesCompatible from "../../../../../../src/main_thread/decrypt/utils/are_init_values_compatible.ts";

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

  it("should return false if only some systemIds are shared", () => {
    const stored = [
      { systemId: "AA", hash: 1, data: new Uint8Array([1]) },
      { systemId: "BB", hash: 2, data: new Uint8Array([2]) },
    ];
    const newElts = [
      { systemId: "AA", hash: 1, data: new Uint8Array([1]) },
      { systemId: "CC", hash: 3, data: new Uint8Array([3]) },
    ];
    expect(areInitializationValuesCompatible(stored, newElts)).toEqual(false);
    expect(areInitializationValuesCompatible(newElts, stored)).toEqual(false);
  });

  it("should return false if data differ after an unfound systemId", () => {
    const stored = [
      { systemId: "AA", hash: 1, data: new Uint8Array([1]) },
      { systemId: "BB", hash: 2, data: new Uint8Array([2]) },
      { systemId: "CC", hash: 3, data: new Uint8Array([3]) },
    ];
    const newElts = [
      { systemId: "AA", hash: 1, data: new Uint8Array([1]) },
      { systemId: "CC", hash: 4, data: new Uint8Array([4]) },
      { systemId: "DD", hash: 5, data: new Uint8Array([5]) },
      { systemId: "EE", hash: 6, data: new Uint8Array([6]) },
    ];
    expect(areInitializationValuesCompatible(stored, newElts)).toEqual(false);
    expect(areInitializationValuesCompatible(newElts, stored)).toEqual(false);
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
