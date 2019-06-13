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

import { AsyncSubject } from "rxjs";
import {
  buildInitIndexSegment,
  getSegmentBuffer,
} from "../apis/dash/dashConnectivity";
import {
  chooseVideoQuality,
  concatBytes,
  takeUntilFilter,
} from "../apis/dash/dashTools";
import { IRepresentationIndex } from "../../../../manifest";
import { from } from "rxjs";
// import { from } from "rxjs";

const resForMakeHTTPRequest = new Int16Array(0);
jest.mock("../utils.ts", () => ({
  makeHTTPRequest: () => resForMakeHTTPRequest,
}));

describe("Download2go - dash content manipulation", () => {
  describe("dashConnectivity", () => {
    describe("[buildInitIndexSegment]", () => {
      it("should return an Init and index segment", () => {
        return buildInitIndexSegment({
          segmentBase: { indexRange: [0, 200] },
          initialization: {
            range: [300, 700],
            mediaURL:
              "http://dash-vod-aka-test.canal-bis.com/multicodec/index.mpd",
          },
        }).then(res => {
          expect(res).toEqual({
            initSegment: resForMakeHTTPRequest,
            indexSegment: resForMakeHTTPRequest,
          });
        });
      });
    });

    describe("[getSegmentBuffer]", () => {
      it("should get a simple segmentBuffer on BaseRepresentationIndex", () => {
        getSegmentBuffer({
          segment: {
            id: "test",
            isInit: false,
            mediaURL: "",
            range: [300, 600],
            duration: 200,
            timescale: 10,
            time: 10,
          },
          url: "http://dash-vod-aka-test.canal-bis.com/multicodec/index.mpd",
          type: "BaseRepresentationIndex",
        }).then(res => {
          expect(res).toEqual({
            data: resForMakeHTTPRequest,
            duration: 200,
            timescale: 10,
            time: 10,
          });
        });
      });

      it("should get a simple segmentBuffer on TemplateRepresentationIndex", () => {
        getSegmentBuffer({
          segment: {
            id: "test",
            isInit: false,
            mediaURL: "azerty",
            range: [300, 600],
            duration: 200,
            timescale: 10,
            time: 10,
          },
          url: "",
          type: "TemplateRepresentationIndex",
        }).then(res => {
          expect(res).toEqual({
            data: resForMakeHTTPRequest,
            duration: 200,
            timescale: 10,
            time: 10,
          });
        });
      });
    });
  });

  describe("dashTools", () => {
    describe("[chooseVideoQuality]", () => {
      it("should return the only quality available", () => {
        const qualities = [
          {
            bitrate: 112,
            index: {} as IRepresentationIndex,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
        ];
        const res = chooseVideoQuality(qualities, "video", "HIGH");
        expect(res).toEqual(qualities);
      });

      it("should return the best quality available", () => {
        const qualities = [
          {
            bitrate: 112,
            index: {} as IRepresentationIndex,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
          {
            bitrate: 11222,
            index: {} as IRepresentationIndex,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ];
        const res1 = chooseVideoQuality(qualities, "video", "HIGH");
        expect(res1).toEqual([
          {
            bitrate: 11222,
            index: {} as IRepresentationIndex,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ]);
        const res2 = chooseVideoQuality(qualities, "video", [1920, 1380]);
        expect(res2).toEqual([
          {
            bitrate: 11222,
            index: {} as IRepresentationIndex,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ]);
      });

      it("should return MEDIUM since specific quality is not existing", () => {
        const qualities = [
          {
            bitrate: 112,
            index: {} as IRepresentationIndex,
            id: "id--1",
            height: 200,
            width: 100,
          },
          {
            bitrate: 112,
            index: {} as IRepresentationIndex,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
          {
            bitrate: 11222,
            index: {} as IRepresentationIndex,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ];
        const res = chooseVideoQuality(qualities, "video", [900, 200]);
        expect(res).toEqual([
          {
            bitrate: 112,
            index: {} as IRepresentationIndex,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
        ]);
      });

      it("should return nothing since we are not in video mode", () => {
        const qualities = [
          {
            bitrate: 112,
            index: {} as IRepresentationIndex,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
          {
            bitrate: 11222,
            index: {} as IRepresentationIndex,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
        ];
        const res = chooseVideoQuality(qualities, "audio", "HIGH");
        expect(res).toEqual(qualities);
      });

      it("should return the lowest quality", () => {
        const qualities = [
          {
            bitrate: 112,
            index: {} as IRepresentationIndex,
            id: "id--1",
            height: 1280,
            width: 1920,
          },
          {
            bitrate: 11222,
            index: {} as IRepresentationIndex,
            id: "id--2",
            height: 1380,
            width: 1920,
          },
          {
            bitrate: 112,
            index: {} as IRepresentationIndex,
            id: "id--1",
            height: 200,
            width: 300,
          },
        ];
        const res = chooseVideoQuality(qualities, "video", "LOW");
        expect(res).toEqual([
          {
            bitrate: 112,
            index: {} as IRepresentationIndex,
            id: "id--1",
            height: 200,
            width: 300,
          },
        ]);
      });
    });

    describe("[concatBytes]", () => {
      it("should return a Uint8Array with length of 4 but empty", () => {
        const data1 = new Uint8Array(2);
        const data2 = new Uint8Array(2);
        const res = concatBytes(data1, data2);
        expect(res.byteLength).toEqual(4);
      });

      it("should return a Uint8Array concat which is not containing empty value", () => {
        const data1 = Uint8Array.from([21, 12, 90]);
        const data2 = Uint8Array.from([82, 67, 23]);
        const res = concatBytes(data1, data2);
        expect(res).toEqual(Uint8Array.from([21, 12, 90, 82, 67, 23]));
      });
    });

    describe("[takeUntilFilter]", () => {
      it("should return a normal stream depending on callback boolean", () => {
        const obs2 = new AsyncSubject<void>();
        from([["1", 1], ["2", 2], ["3", 3], ["4", 4], ["5", 5]])
          .pipe(takeUntilFilter<string, number>(
            ([, progress]) => progress % 2 === 0,
            obs2
          ) as any)
          .subscribe(res => {
            if (Array.isArray(res)) {
              expect(res[1]).toEqual(2);
            }
          });
      });

      it("should return a prior stream depending on observable emit whatever is the callback condition", () => {
        const obs2 = new AsyncSubject<void>();
        obs2.next();
        obs2.complete();
        from([["1", 1], ["2", 2], ["3", 3], ["4", 4], ["5", 5]])
          .pipe(takeUntilFilter<string, number>(
            ([, progress]) => progress % 3 === 0,
            obs2
          ) as any)
          .subscribe(res => {
            if (Array.isArray(res)) {
              expect(res[1]).toEqual(1);
            }
          });
      });
    });
  });
});
