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

import shouldReloadMediaSourceOnDecipherabilityUpdate from "../should_reload_media_source_on_decipherability_update";

describe("Compat - shouldReloadMediaSourceOnDecipherabilityUpdate", () => {
  it("should return true for an unknown key system", () => {
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate(null)).toEqual(true);
  });

  it("should return false for any string containing the string \"widevine\"", () => {
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("widevine")).toEqual(false);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("com.widevine.alpha"))
      .toEqual(false);
  });

  it("should return true for any string not containing the string \"widevine\"", () => {
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("idevine")).toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("widevin")).toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("playready")).toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("com.nagra.prm"))
      .toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("webkit-org.w3.clearkey"))
      .toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("org.w3.clearkey"))
      .toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("com.microsoft.playready"))
      .toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("com.chromecast.playready"))
      .toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate("com.youtube.playready"))
      .toEqual(true);
    expect(shouldReloadMediaSourceOnDecipherabilityUpdate(""))
      .toEqual(true);
  });
});
