import { describe, afterEach, it, expect } from "vitest";
import globalScope from "../global_scope";
import idGenerator from "../id_generator";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

const oldNumberDef = globalScope.Number;

describe("utils - idGenerator", () => {
  afterEach(() => {
    // There's an ugly test in here that changes the Number object
    globalScope.Number = oldNumberDef;
  });

  it("should increment an ID", () => {
    const generateNewID = idGenerator();
    expect(generateNewID()).toBe("0");
    expect(generateNewID()).toBe("1");
    expect(generateNewID()).toBe("2");
    expect(generateNewID()).toBe("3");
    expect(generateNewID()).toBe("4");
    expect(generateNewID()).toBe("5");
  });
  it("should allow multiple incremental ID at the same time", () => {
    const generateNewID1 = idGenerator();
    const generateNewID2 = idGenerator();
    const generateNewID3 = idGenerator();
    expect(generateNewID1()).toBe("0");
    expect(generateNewID1()).toBe("1");
    expect(generateNewID2()).toBe("0");
    expect(generateNewID1()).toBe("2");
    expect(generateNewID1()).toBe("3");
    expect(generateNewID2()).toBe("1");
    expect(generateNewID2()).toBe("2");
    expect(generateNewID1()).toBe("4");
    expect(generateNewID1()).toBe("5");
    expect(generateNewID2()).toBe("3");
    expect(generateNewID2()).toBe("4");
    expect(generateNewID3()).toBe("0");
  });
  it("should preprend a 0 after A LOT of ID generation", () => {
    // Ugly but I don't care
    globalScope.Number = {
      MAX_SAFE_INTEGER: 3,
      isSafeInteger: (x: number) => x <= 3,
    } as typeof globalScope.Number;
    const generateNewID1 = idGenerator();
    const generateNewID2 = idGenerator();
    const generateNewID3 = idGenerator();
    expect(generateNewID1()).toBe("0");
    expect(generateNewID1()).toBe("1");
    expect(generateNewID2()).toBe("0");
    expect(generateNewID1()).toBe("2");
    expect(generateNewID1()).toBe("00");
    expect(generateNewID2()).toBe("1");
    expect(generateNewID2()).toBe("2");
    expect(generateNewID1()).toBe("01");
    expect(generateNewID1()).toBe("02");
    expect(generateNewID2()).toBe("00");
    expect(generateNewID2()).toBe("01");
    expect(generateNewID3()).toBe("0");

    expect(generateNewID1()).toBe("000");
    expect(generateNewID1()).toBe("001");
    expect(generateNewID1()).toBe("002");
    expect(generateNewID1()).toBe("0000");
  });
});
