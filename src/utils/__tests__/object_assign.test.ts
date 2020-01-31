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

import objectAssign from "../object_assign";

describe("utils - objectAssign", () => {
  it("should throw if target is not an object", () => {
    expect(() => {
      objectAssign(null, {});
    }).toThrow("Cannot convert undefined or null to object");
    expect(() => {
      objectAssign(undefined, {});
    }).toThrow("Cannot convert undefined or null to object");
  });

  it("should update the first argument and return it", () => {
    const obj = {};
    expect(objectAssign(obj)).toBe(obj);
    expect(obj).toEqual({});

    expect(objectAssign(obj, { a: 4, c: { d: "toto" }})).toBe(obj);
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

    expect(objectAssign(obj,
                        { c: { d: 55 } },
                        { c: { d: 85 } })).toBe(obj);
    expect(obj).toEqual({ a: 78, c: { d: 85 } });
  });
});
