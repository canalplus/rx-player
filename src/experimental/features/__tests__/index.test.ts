import { DASH_WASM as FEATURE_DASH_WASM } from "../dash_wasm";
import { DEBUG_ELEMENT as FEATURE_DEBUG_ELEMENT } from "../debug_element";
import { DASH_WASM, DEBUG_ELEMENT, METAPLAYLIST, LOCAL_MANIFEST } from "../index";
import { LOCAL_MANIFEST as FEATURE_LOCAL_MANIFEST } from "../local";
import { METAPLAYLIST as FEATURE_METAPLAYLIST } from "../metaplaylist";

describe("Experimental Features", () => {
  it("should export all experimental features", () => {
    expect(DASH_WASM).toBe(FEATURE_DASH_WASM);
    expect(DEBUG_ELEMENT).toBe(FEATURE_DEBUG_ELEMENT);
    expect(METAPLAYLIST).toBe(FEATURE_METAPLAYLIST);
    expect(LOCAL_MANIFEST).toBe(FEATURE_LOCAL_MANIFEST);
  });
});
