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

import { expect } from "chai";
import assert from "../assert";

describe("utils - assert", () => {
  it("should throw an error if the assertion is falsy", () => {
    const FALSY_VALUES = ["", false, 0, undefined, null];

    FALSY_VALUES.forEach(falsyValue => {
      let error;
      try {
        assert(falsyValue);
      } catch (e) {
        error = e;
        expect(e).to.exist;
      }
      expect(error).to.exist;
      expect(error.message).to.equal(undefined);
      expect(error.name).to.equal("AssertionError");
    });
  });

  it("should be able to take a message argument", () => {
    const FALSY_VALUES = ["", false, 0, undefined, null];
    const myMessage = "foo bar\n\r";

    FALSY_VALUES.forEach(falsyValue => {
      let error;
      try {
        assert(falsyValue, myMessage);
      } catch (e) {
        error = e;
        expect(e).to.exist;
      }
      expect(error).to.exist;
      expect(error.message).to.equal(myMessage);
      expect(error.name).to.equal("AssertionError");
    });
  });

  it("should not throw an error if the assertion is truthy", () => {
    const TRUTHY_VALUES = ["a", true, -1, [], {}];

    TRUTHY_VALUES.forEach(truthyValue => {
      assert(truthyValue);
    });
  });
});

describe("utils - assert.equal", () => {
  it("should throw an error if the arguments are not strictly equal", () => {
    const UNEQUAL_VALUES = [
      [false, true],
      [0, 1],
      ["a", "aa"],
      [{}, {}],
      [[], []],
    ];

    UNEQUAL_VALUES.forEach(unequalValue => {
      let error;
      try {
        assert.equal(unequalValue[0], unequalValue[1]);
      } catch (e) {
        error = e;
      }
      expect(error).to.exist;
      expect(error.message).to.equal(undefined);
      expect(error.name).to.equal("AssertionError");
    });
  });

  it("should be able to take a message argument", () => {
    const UNEQUAL_VALUES = [
      [false, true],
      [0, 1],
      ["a", "aa"],
      [{}, {}],
      [[], []],
    ];
    const myMessage = "foo bar\n\r";

    UNEQUAL_VALUES.forEach(unequalValue => {
      let error;
      try {
        assert.equal(unequalValue[0], unequalValue[1], myMessage);
      } catch (e) {
        error = e;
      }
      expect(error).to.exist;
      expect(error.message).to.equal(myMessage);
      expect(error.name).to.equal("AssertionError");
    });
  });

  it("should not throw an error if the arguments are strictly equal", () => {
    const obj = {a: 1};
    const arr = [[[[[]]]]];
    const EQUAL_VALUES = [
      [true, true],
      [0, 0],
      ["a", "a"],
      [obj, obj],
      [arr, arr],
    ];

    EQUAL_VALUES.forEach(equalValues => {
      assert.equal(equalValues[0], equalValues[1]);
    });
  });
});

describe("utils - assert.iface", () => {
  it("should throw if undefined or null is given", () => {
    let error;
    const nameOfMyObj = "toto titi";

    const objIface = {
      a: "number",
      b: "object",
      d: "function",
      e: "boolean",
    };
    try {
      assert.iface(undefined, nameOfMyObj, objIface);
    } catch (e) {
      error = e;
    }
    expect(error).to.exist;
    expect(error.message).to.equal(`${nameOfMyObj} should be an object`);
    expect(error.name).to.equal("AssertionError");

    error = null;

    try {
      assert.iface(null, nameOfMyObj, objIface);
    } catch (e) {
      error = e;
    }
    expect(error).to.exist;
    expect(error.message).to.equal(`${nameOfMyObj} should be an object`);
    expect(error.name).to.equal("AssertionError");
  });

  it("should throw if the concerned interface is not respected", () => {
    let error;
    const nameOfMyObj = "toto titi";
    const myObj = {
      a: 45,
      b: {
        c: "toto",
      },
      d: () => {},
      e: true,
    };

    const objIface = {
      a: "number",
      b: "object",
      d: "function",
      e: "boolean",
      f: "function", // one more key
    };

    try {
      assert.iface(myObj, nameOfMyObj, objIface);
    } catch (e) {
      error = e;
    }
    expect(error).to.exist;
    expect(error.message)
      .to.equal(`${nameOfMyObj} should have property f as a function`);
    expect(error.name).to.equal("AssertionError");
  });

  it("should not throw if the concerned interface is respected", () => {
    const nameOfMyObj = "toto titi";
    const myObj = {
      a: 45,
      b: {
        c: "toto",
      },
      d: () => {},
      e: true,
    };

    const objIface = {
      a: "number",
      b: "object",
      d: "function",
      e: "boolean",
    };

    assert.iface(myObj, nameOfMyObj, objIface);
  });
});
