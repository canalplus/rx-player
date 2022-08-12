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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import assert, {
  assertInterface,
} from "../assert";

describe("utils - assert", () => {
  it("should throw an error if the assertion is false", () => {
    let error;
    try {
      assert(false);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(error.message).toBe("invalid assertion");
    expect(error.name).toBe("AssertionError");
  });

  it("should be able to take a message argument", () => {
    const myMessage = "foo bar\n\r";
    let error;
    try {
      assert(false, myMessage);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(error.message).toBe(myMessage);
    expect(error.name).toBe("AssertionError");
  });

  it("should not throw an error if the assertion is true", () => {
    assert(true);
  });
});

describe("utils - assertInterface", () => {
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
      assertInterface(undefined, objIface, nameOfMyObj);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(error.message).toBe(`${nameOfMyObj} should be an object`);
    expect(error.name).toBe("AssertionError");

    error = null;

    try {
      assertInterface(null, objIface, nameOfMyObj);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(error.message).toBe(`${nameOfMyObj} should be an object`);
    expect(error.name).toBe("AssertionError");
  });

  it("should throw if the concerned interface is not respected", () => {
    let error;
    const nameOfMyObj = "toto titi";
    const myObj = {
      a: 45,
      b: {
        c: "toto",
      },
      /* eslint-disable no-empty,@typescript-eslint/no-empty-function */
      d: () => {},
      /* eslint-enable no-empty,@typescript-eslint/no-empty-function */
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
      assertInterface(myObj, objIface, nameOfMyObj);
    } catch (e) {
      error = e;
    }
    /* eslint-disable @typescript-eslint/no-unused-expressions */
    expect(error).toBeDefined();
    /* eslint-enable @typescript-eslint/no-unused-expressions */

    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(error.message)
      .toBe(`${nameOfMyObj} should have property f as a function`);
    expect(error.name).toBe("AssertionError");
  });

  it("should name the interface 'object' if no name is specified", () => {
    let error;
    const myObj = {
      a: 45,
      b: {
        c: "toto",
      },
      /* eslint-disable no-empty,@typescript-eslint/no-empty-function */
      d: () => {},
      /* eslint-enable no-empty,@typescript-eslint/no-empty-function */
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
      assertInterface(myObj, objIface);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect(error.message)
      .toBe("object should have property f as a function");
    expect(error.name).toBe("AssertionError");
  });

  it("should not throw if the concerned interface is respected", () => {
    const nameOfMyObj = "toto titi";
    const myObj = {
      a: 45,
      b: {
        c: "toto",
      },
      /* eslint-disable no-empty,@typescript-eslint/no-empty-function */
      d: () => {},
      /* eslint-enable no-empty,@typescript-eslint/no-empty-function */
      e: true,
    };

    const objIface = {
      a: "number",
      b: "object",
      d: "function",
      e: "boolean",
    };

    assertInterface(myObj, objIface, nameOfMyObj);
  });

  /* eslint-disable max-len */
  it("should not consider inherited properties as part of the interface", () => {
  /* eslint-enable max-len */

    const nameOfMyObj = "toto titi";
    const myObj = {
      a: 45,
      b: {
        c: "toto",
      },
      /* eslint-disable no-empty,@typescript-eslint/no-empty-function */
      d: () => {},
      /* eslint-enable no-empty,@typescript-eslint/no-empty-function */
      e: true,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Object.prototype as any).f = "number";

    const objIface = {
      a: "number",
      b: "object",
      d: "function",
      e: "boolean",
    };

    assertInterface(myObj, objIface, nameOfMyObj);
  });
});
