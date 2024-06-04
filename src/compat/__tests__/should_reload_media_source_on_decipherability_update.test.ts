import { describe, it, expect } from "vitest";
import shouldReloadMediaSourceOnDecipherabilityUpdate from "../should_reload_media_source_on_decipherability_update";

describe("Compat - shouldReloadMediaSourceOnDecipherabilityUpdate", () => {
  it("should return true for an unknown key system", () => {
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate(undefined)).toEqual(true);
  });

  it('should return false for any string containing the string "widevine"', () => {
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("widevine")).toEqual(false);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("com.widevine.alpha")).toEqual(
      false,
    );
  });

  it('should return true for any string not containing the string "widevine"', () => {
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("idevine")).toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("widevin")).toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("playready")).toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("com.nagra.prm")).toEqual(true);
    expect(
      shouldReloadMediaSourceOnDecipherabilityUpdate("webkit-org.w3.clearkey"),
    ).toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("org.w3.clearkey")).toEqual(
      true,
    );
    expect(
      shouldReloadMediaSourceOnDecipherabilityUpdate("com.microsoft.playready"),
    ).toEqual(true);
    expect(
      shouldReloadMediaSourceOnDecipherabilityUpdate("com.chromecast.playready"),
    ).toEqual(true);
    expect(
      shouldReloadMediaSourceOnDecipherabilityUpdate("com.youtube.playready"),
    ).toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("")).toEqual(true);
  });
});
