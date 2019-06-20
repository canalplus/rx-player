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

import { Observable } from "rxjs";

import { ISegment } from "../../../../../manifest";
import { ISidxSegment } from "../../../../../parsers/containers/isobmff";
import parseManifest from "../../../../../parsers/manifest/dash/index";
import { IParserResponse } from "../../../../../parsers/manifest/dash/parse_mpd";
import { IParsedManifest } from "../../../../../parsers/manifest/types";
import { makeHTTPRequest, SegmentConstuctionError } from "../../utils";
import { ITypedArray } from "../drm/keySystems";
import { IUtils } from "./../../types";
import {
  IRepresentation,
  ISegmentBuilder,
  ISegmentsBuiltType,
  ISegmentBuilt,
} from "./types";

/**
 * Get a manifest from a server and parse it.
 *
 * @param url - The url manifest mpd file
 * @returns The manifest parsed IParserResponse<IParsedManifest>
 *
 */
export const getOnlineMPDParsed = async (
  url: string
): Promise<IParserResponse<IParsedManifest>> => {
  const data = await makeHTTPRequest<string>(url, {
    method: "GET",
    responseType: "text",
  });
  return parseManifest(new DOMParser().parseFromString(data, "text/xml"), {
    loadExternalClock: false,
    url,
  });
};

/**
 * Build the init segments to be able to retieve SIDX (index/init)
 *
 * @param IRepresentation - The segmentBase and initialization segment
 * @returns The initSegment and indexSegment
 *
 */
export const buildInitIndexSegment = async ({
  segmentBase,
  initialization,
}: IRepresentation): Promise<{
initSegment: ITypedArray | ArrayBuffer;
indexSegment: ITypedArray | ArrayBuffer;
}> => {
  try {
    if (!initialization.mediaURL) {
      throw new Error("MediaURL from the initialization segment is broken");
    }
    const [initSegment, indexSegment] = await Promise.all([
      makeHTTPRequest<ITypedArray | ArrayBuffer>(initialization.mediaURL, {
        headers: { Range: `bytes=${initialization.range.join("-")}` },
        method: "GET",
        responseType: "arraybuffer",
      }),
      makeHTTPRequest<ITypedArray | ArrayBuffer>(initialization.mediaURL, {
        headers: { Range: `bytes=${segmentBase.indexRange.join("-")}` },
        method: "GET",
        responseType: "arraybuffer",
      }),
    ]);
    return { initSegment, indexSegment };
  } catch (e) {
    throw new SegmentConstuctionError(e.message);
  }
};

/**
 * Get a segment from a server.
 *
 * @param ISidxSegment - SIDX or ISegment Segment information
 * @param url - base url of the segment
 * @returns The data,duration,time,timescale of the current segment retrieved
 *
 */
export const getSegmentBuffer = async ({
  segment,
  url,
  type,
}: {
segment: ISidxSegment | ISegment;
url: string | null;
type: "TemplateRepresentationIndex" | "BaseRepresentationIndex";
}): Promise<ISegmentsBuiltType> => {
  try {
    if (type === "BaseRepresentationIndex") {
      if (!url) {
        throw new SegmentConstuctionError(
          "The mediaURL is not defined for the given representation segment"
        );
      }
      const { range, duration, timescale, time } = segment as ISidxSegment;
      const data = await makeHTTPRequest<ITypedArray | ArrayBuffer>(url, {
        headers: { Range: `bytes=${range.join("-")}` },
        method: "GET",
        responseType: "arraybuffer",
      });
      return {
        data,
        duration,
        time,
        timescale,
      };
    } else {
      const { mediaURL, duration = 0, timescale, time } = segment as ISegment;
      const data = await makeHTTPRequest<ITypedArray | ArrayBuffer>(
        mediaURL || "",
        {
          method: "GET",
          responseType: "arraybuffer",
        }
      );
      return {
        data,
        duration,
        time,
        timescale,
      };
    }
  } catch (e) {
    throw new SegmentConstuctionError(e.message);
  }
};

/**
 * A simple manager observable that either get the segment
 * if is not already built or skip to the next one.
 *
 * @param segmentBuilder - Either a SegmentBuilt type or a ISegmentBuilder
 * @param optionBuilder - Emitter and db instances
 * @returns An Observable of the SegmentBuilt
 *
 */
export const createSegment = (
  segmentBuilder: ISegmentBuilder | ISegmentBuilt,
  optionBuilder: IUtils
): Observable<ISegmentBuilt> => {
  return new Observable<ISegmentBuilt>(obs => {
    if (Array.isArray(segmentBuilder)) {
      obs.next(segmentBuilder);
      obs.complete();
      return;
    }
    const { segment, utils } = segmentBuilder;
    getSegmentBuffer({
      segment,
      type: utils.type,
      url: utils.url,
    })
      .then(async ({ data, duration, timescale, time }) => {
        try {
          const sizePerBuffer = data.byteLength;
          const [segmentKey, keyIndex] = utils.segmentKey;
          const key = await optionBuilder.db.put("segments", {
            contentID: utils.contentID,
            data,
            segmentKey,
            size: sizePerBuffer,
          });
          obs.next([[key as string, keyIndex], time, timescale, duration]);
          if (optionBuilder.progressBarBuilder$) {
            optionBuilder.progressBarBuilder$.next({
              id: utils.id,
              segmentDownloaded: 1,
              size: sizePerBuffer,
            });
          }
          obs.complete();
        } catch (e) {
          obs.error(e);
        }
      })
      .catch(err => obs.error(err));
  });
};
