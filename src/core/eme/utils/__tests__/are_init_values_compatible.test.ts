/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import areInitializationValuesCompatible from "../are_init_values_compatible";

describe("eme - utils - areInitializationValuesCompatible", () => {
  it("should return false if either initialization data is empty", () => {
    const test1 = areInitializationValuesCompatible([], []);
    const test2 = areInitializationValuesCompatible(
      [],
      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) } ]);
    const test3 = areInitializationValuesCompatible(
      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) } ],
      []);
    expect(test1).toEqual(false);
    expect(test2).toEqual(false);
    expect(test3).toEqual(false);
  });

  it("should return true for equivalent initialization data", () => {
    const test1 = areInitializationValuesCompatible(
      [ { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) } ],
      [ { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) } ]
    );
    const test2 = areInitializationValuesCompatible(

      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) } ],

      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) } ]);
    expect(test1).toEqual(true);
    expect(test2).toEqual(true);
  });

  /* eslint-disable max-len */
  it("should return true if the first initializationData is contained in the second", () => {
  /* eslint-enable max-len */
    const test1 = areInitializationValuesCompatible(

      [ { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ],

      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ]);
    expect(test1).toEqual(true);
  });

  /* eslint-disable max-len */
  it("should return true if the second initializationData is contained in the first", () => {
  /* eslint-enable max-len */
    const test1 = areInitializationValuesCompatible(
      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ],

      [ { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ]
    );
    expect(test1).toEqual(true);
  });

  /* eslint-disable max-len */
  it("should return false if initializationData systemIds are different", () => {
  /* eslint-enable max-len */
    const test1 = areInitializationValuesCompatible(

      [ { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ],

      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "BB",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "CC",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) },
        { systemId: "DD",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ]);
    expect(test1).toEqual(false);
  });

  /* eslint-disable max-len */
  it("should return false if at least one hash is different", () => {
  /* eslint-enable max-len */
    const test1 = areInitializationValuesCompatible(

      [ { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ],

      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE",
          hash: 19,
          data: new Uint8Array([4, 4, 2]) } ]);
    const test2 = areInitializationValuesCompatible(

      [ { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ],

      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 25,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ]);
    expect(test1).toEqual(false);
    expect(test2).toEqual(false);
  });

  /* eslint-disable max-len */
  it("should return false if init data are different", () => {
  /* eslint-enable max-len */
    const test1 = areInitializationValuesCompatible(

      [ { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ],

      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 27,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 3, 3]) } ]);
    const test2 = areInitializationValuesCompatible(

      [ { systemId: "F054",
          hash: 25,
          data: new Uint8Array([2, 9, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ],

      [ { systemId: "AA",
          hash: 15,
          data: new Uint8Array([1, 2, 3]) },
        { systemId: "F054",
          hash: 25,
          data: new Uint8Array([2, 8, 2]) },
        { systemId: "FA",
          hash: 18,
          data: new Uint8Array([2, 2, 2]) },
        { systemId: "FE",
          hash: 18,
          data: new Uint8Array([4, 4, 2]) } ]);
    expect(test1).toEqual(false);
    expect(test2).toEqual(false);
  });
});
