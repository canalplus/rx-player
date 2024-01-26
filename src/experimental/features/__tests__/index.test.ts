import { METAPLAYLIST, LOCAL_MANIFEST } from "../index";
import { LOCAL_MANIFEST as FEATURE_LOCAL_MANIFEST } from "../local";
import { METAPLAYLIST as FEATURE_METAPLAYLIST } from "../metaplaylist";

describe("Experimental Features", () => {
  it("should export all experimental features", () => {
    expect(METAPLAYLIST).toBe(FEATURE_METAPLAYLIST);
    expect(LOCAL_MANIFEST).toBe(FEATURE_LOCAL_MANIFEST);
  });
});
