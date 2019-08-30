/**
 * Copyright 2017 CANAL+ Group
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

import { IParsedRepresentation } from "../../../../parsers/manifest/types";
import { chooseVideoQuality } from "../apis/dash/dashTools";

describe("Download2go - dash content manipulation", () => {
  describe("dashTools", () => {
    describe("[chooseVideoQuality]", () => {
      it("should return the only quality available", () => {
        const qualities: IParsedRepresentation[] = [
          {
            bitrate: 112,
            index: {} as any,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
        ];
        const res = chooseVideoQuality(qualities, "video", "HIGH");
        expect(res).toEqual(qualities);
      });

      it("should return the best quality available", () => {
        const qualities: IParsedRepresentation[] = [
          {
            bitrate: 112,
            index: {} as any,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
          {
            bitrate: 11222,
            index: {} as any,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ];
        const res1 = chooseVideoQuality(qualities, "video", "HIGH");
        expect(res1).toEqual([
          {
            bitrate: 11222,
            index: {} as any,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ]);
        const res2 = chooseVideoQuality(qualities, "video", [1920, 1380]);
        expect(res2).toEqual([
          {
            bitrate: 11222,
            index: {} as any,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ]);
      });

      it("should return MEDIUM since specific quality is not existing", () => {
        const qualities: IParsedRepresentation[] = [
          {
            bitrate: 112,
            index: {} as any,
            id: "id--1",
            height: 200,
            width: 100,
          },
          {
            bitrate: 112,
            index: {} as any,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
          {
            bitrate: 11222,
            index: {} as any,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ];
        const res = chooseVideoQuality(qualities, "video", [900, 200]);
        expect(res).toEqual([
          {
            bitrate: 112,
            index: {} as any,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
        ]);
      });

      it("should return nothing since we are not in video mode", () => {
        const qualities: IParsedRepresentation[] = [
          {
            bitrate: 112,
            index: {} as any,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
          {
            bitrate: 11222,
            index: {} as any,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ];
        const res = chooseVideoQuality(qualities, "audio", "HIGH");
        expect(res).toEqual(qualities);
      });

      it("should return the lowest quality", () => {
        const qualities: IParsedRepresentation[] = [
          {
            bitrate: 112,
            index: {} as any,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
          {
            bitrate: 11222,
            index: {} as any,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
          {
            bitrate: 112,
            index: {} as any,
            id: "id--1",
            height: 200,
            width: 300,
          },
        ];
        const res = chooseVideoQuality(qualities, "video", "LOW");
        expect(res).toEqual([
          {
            bitrate: 112,
            index: {} as any,
            id: "id--1",
            height: 200,
            width: 300,
          },
        ]);
      });
    });
  });
});
