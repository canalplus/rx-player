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

import type { IManifest } from "../../../../../manifest";
import parseFromString from "../parse_from_xml_string";

describe("parseFromString", () => {
  it("throws root if not MPD", function () {
    const xml = "<foo></foo>";

    expect(function () {
      parseFromString(xml, {
        url: "",
        externalClockOffset: 10,
        unsafelyBaseOnPreviousManifest: null,
      });
    }).toThrow("document root should be MPD");
    expect(function () {
      const prevManifest = {} as unknown as IManifest;
      parseFromString(xml, {
        url: "",
        unsafelyBaseOnPreviousManifest: prevManifest,
      });
    }).toThrow("document root should be MPD");
  });
});
