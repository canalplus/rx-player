import { describe, it, expect } from "vitest";
import {
  METAPLAYLIST,
  LOCAL_MANIFEST,
} from "../../../../../src/experimental/features/index.ts";
import { LOCAL_MANIFEST as FEATURE_LOCAL_MANIFEST } from "../../../../../src/experimental/features/local.ts";
import { METAPLAYLIST as FEATURE_METAPLAYLIST } from "../../../../../src/experimental/features/metaplaylist.ts";

describe("Experimental Features", () => {
  it("should export all experimental features", () => {
    expect(METAPLAYLIST).toBe(FEATURE_METAPLAYLIST);
    expect(LOCAL_MANIFEST).toBe(FEATURE_LOCAL_MANIFEST);
  });
});
