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

import {
  createDashUrlDetokenizer,
  replaceRepresentationDASHTokens,
} from "../tokens";

describe("dash parser tokens helpers", function() {
  describe("createDashUrlDetokenizer", () => {
    it("should correctly parse time token", function() {
      expect(createDashUrlDetokenizer(1000, undefined)("Example_Token_$Time$"))
        .toBe("Example_Token_1000");
    });
    it("should correctly parse number token", function() {
      expect(createDashUrlDetokenizer(1000, 3)("Example_Token_$Number$"))
        .toBe("Example_Token_3");
    });
    it("should correctly parse both time and number token", function() {
      expect(createDashUrlDetokenizer(1000, 3)("Example_Token_$Number$_$Time$"))
        .toBe("Example_Token_3_1000");
    });
    it("should not replace undefined tokens", function() {
      expect(createDashUrlDetokenizer(1000, 3)("Example_Token_$Nmber$_$ime$"))
        .toBe("Example_Token_$Nmber$_$ime$");
    });
    it("should return segment name if no token", function() {
      expect(createDashUrlDetokenizer(undefined, undefined)("Example_Token"))
        .toBe("Example_Token");
    });
  });

  describe("replaceRepresentationDASHTokens", () => {
    it("should correctly parse ID token", function() {
      expect(replaceRepresentationDASHTokens("Example_$RepresentationID$", "fakeId"))
        .toBe("Example_fakeId");
    });
    it("should correctly parse bitrate token", function() {
      expect(replaceRepresentationDASHTokens("Example_$Bandwidth$", "", 3000))
        .toBe("Example_3000");
    });
    it("should return segment name if no token", function() {
      expect(replaceRepresentationDASHTokens("Example_Token"))
        .toBe("Example_Token");
    });
  });
});
