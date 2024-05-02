import { describe, beforeEach, it, expect, vi } from "vitest";
import { getKeyIdsLinkedToSession, getMissingKeyIds } from "../../content_decryptor";
import InitDataValuesContainer from "../../utils/init_data_values_container";
import KeySessionRecord from "../../utils/key_session_record";

describe("content_decryptor - blacklist missing key Ids", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("should return an empty array if actualKeyIds contains all expectedKeyIds", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
    ];
    const actualKeyIds = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];

    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual([]);
  });

  it("should return expectedKeyIds if actualKeyIds does not contain them", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
    ];
    const actualKeyIds: Uint8Array[] = []; // Empty array, none of the expectedKeyIds are present

    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual(expectedKeyIds);
  });

  it("should return only the missing key IDs from expectedKeyIds", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
      new Uint8Array([4]),
    ];
    const actualKeyIds = [new Uint8Array([1]), new Uint8Array([3])]; // Missing [2] and [4]
    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual([new Uint8Array([2]), new Uint8Array([4])]);
  });
});

describe("content_decryptor - getKeyIdsLinkedToSession", () => {
  it("should return the whitelisted and blacklisted depending if keys are usable or not", () => {
    const initDataValues = new InitDataValuesContainer([
      {
        systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed" /* Widevine */,
        data: new Uint8Array([1, 2, 3]),
      },
    ]);

    const keySessionRecord = new KeySessionRecord({
      type: "cenc",
      values: initDataValues,
    });
    const { whitelisted, blacklisted } = getKeyIdsLinkedToSession(
      /* InitData */ {
        type: "cenc",
        values: initDataValues,
      },
      /* KeySessionRecord */ keySessionRecord,
      /* SingleLicensePer */ "init-data",
      /* isCurrentLicense */ true,
      /* usableKeys */ [new Uint8Array([1]), new Uint8Array([2])],
      /* unusableKeys */ [new Uint8Array([3])],
    );

    expect(whitelisted).toStrictEqual([new Uint8Array([1]), new Uint8Array([2])]);
    expect(blacklisted).toStrictEqual([new Uint8Array([3])]);
  });

  it("should have 1 blacklisted keyIds because it's in the initData but it's not in the usableKeys list", () => {
    const initDataValues = new InitDataValuesContainer([
      {
        systemId: "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed" /* Widevine */,
        data: new Uint8Array([1, 2, 3]),
      },
    ]);

    const keySessionRecord = new KeySessionRecord({
      type: "cenc",
      values: initDataValues,
    });
    const { whitelisted, blacklisted } = getKeyIdsLinkedToSession(
      /* InitData */ {
        type: "cenc",
        values: initDataValues,
        keyIds: [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])],
      },
      /* KeySessionRecord */ keySessionRecord,
      /* SingleLicensePer */ "init-data",
      /* isCurrentLicense */ true,
      /* usableKeys */ [new Uint8Array([1]), new Uint8Array([2])],
      /* unusableKeys */ [],
    );

    expect(whitelisted).toStrictEqual([new Uint8Array([1]), new Uint8Array([2])]);
    expect(blacklisted).toStrictEqual([new Uint8Array([3])]); // KeyId 3 is not in usableKeys list
  });
});
