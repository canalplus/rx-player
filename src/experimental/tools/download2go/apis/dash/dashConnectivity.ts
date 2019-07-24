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

import { Observable, of, throwError } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { ISegment } from "../../../../../manifest";
import { ISidxSegment } from "../../../../../parsers/containers/isobmff";
import parseManifest from "../../../../../parsers/manifest/dash/index";
import { IParserResponse } from "../../../../../parsers/manifest/dash/parse_mpd";
import { IParsedManifest } from "../../../../../parsers/manifest/types";
import xhrRequest from "../../../../../utils/request";
import { makeHTTPRequest, SegmentConstuctionError } from "../../utils";
import { ITypedArray } from "../drm/keySystems";
import { IUtils } from "./../../types";
import {
  IRepresentation,
  ISegmentBuilder,
  ISegmentBuilt,
  ISegmentsBuiltType,
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
export const getSegmentBuffer = ({
  segment,
  url,
  type,
}: {
segment: ISidxSegment | ISegment;
url: string | null;
type: "TemplateRepresentationIndex" | "BaseRepresentationIndex";
}): Observable<ISegmentsBuiltType> => {
  if (type === "BaseRepresentationIndex") {
    if (!url) {
      throw new SegmentConstuctionError(
        "The mediaURL is not defined for the given representation segment"
      );
    }
    const { range, duration, timescale, time } = segment as ISidxSegment;
    return xhrRequest({
      url,
      headers: { Range: `bytes=${range.join("-")}` },
      responseType: "arraybuffer",
    }).pipe(
      mergeMap(({ value }) => {
        return of({
          data: value.responseData,
          duration,
          time,
          timescale,
        });
      })
    );
  } else {
    const { mediaURL, duration = 0, timescale, time } = segment as ISegment;
    return xhrRequest({
      url: mediaURL || "",
      responseType: "arraybuffer",
    }).pipe(
      mergeMap(({ value }) => {
        return of({
          data: value.responseData,
          duration,
          time,
          timescale,
        });
      })
    );
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
  segmentBuilder: ISegmentBuilder,
  optionBuilder: IUtils
): Observable<ISegmentBuilt> => {
  const { segment, utils } = segmentBuilder;
  return getSegmentBuffer({
    segment,
    type: utils.type,
    url: utils.url,
  }).pipe(
    mergeMap(({ data, duration, timescale, time }) => {
      const sizePerBuffer = data.byteLength;
      const [segmentKey] = utils.segmentKey;
      optionBuilder.db
        .put("segments", {
          contentID: utils.contentID,
          data,
          segmentKey,
          size: sizePerBuffer,
          duration,
        })
        .catch(throwError);
      if (optionBuilder.progressBarBuilder$) {
        optionBuilder.progressBarBuilder$.next({
          id: utils.id,
          segmentDownloaded: 1,
          size: sizePerBuffer,
        });
      }
      return of([utils.segmentKey, time, timescale, duration]);
    })
  ) as Observable<ISegmentBuilt>;
};
