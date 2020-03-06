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

import { Observable, throwError } from "rxjs";
import { map } from "rxjs/operators";
import { parseDuration } from "../../../parsers/manifest/dash/node_parsers/utils";
import { IMetaPlaylist } from "../../../parsers/manifest/metaplaylist";
import request from "../../../utils/request/xhr";

/**
 * Load manifest and get duration from it.
 * @param {String} url
 * @param {String} transport
 * @returns {Observable<number>}
 */
function getDurationFromManifest(url: string,
                                 transport: "dash" | "smooth" | "metaplaylist"
): Observable<number> {

  if (transport !== "dash" &&
      transport !== "smooth" &&
      transport !== "metaplaylist") {
    return throwError(new Error("createMetaplaylist: Unknown transport type."));
  }

  if (transport === "dash" || transport === "smooth") {
    return request({ url, responseType: "document" }).pipe(
      map(({ value }) => {
        const { responseData } = value;
        const root = responseData.documentElement;
        if (transport === "dash") {
          const dashDurationAttribute = root.getAttribute("mediaPresentationDuration");
          if (dashDurationAttribute === null) {
            throw new Error("createMetaplaylist: No duration on DASH content.");
          }
          const periodElements = root.getElementsByTagName("Period");
          const firstDASHStartAttribute = periodElements[0]?.getAttribute("start");
          const firstDASHStart =
            firstDASHStartAttribute !== null ? parseDuration(firstDASHStartAttribute) :
                                               0;
          return parseDuration(dashDurationAttribute) - firstDASHStart;
        }
        // smooth
        const smoothDurationAttribute = root.getAttribute("Duration");
        const smoothTimeScaleAttribute = root.getAttribute("TimeScale");
        if (smoothDurationAttribute === null) {
          throw new Error("createMetaplaylist: No duration on smooth content.");
        }
        const timescale = smoothTimeScaleAttribute !== null ?
          parseInt(smoothTimeScaleAttribute, 10) :
          10000000;
        return (parseInt(smoothDurationAttribute, 10)) / timescale;
      })
    );
  }

  // metaplaylist
  return request({ url, responseType: "text" }).pipe(
    map(({ value }) => {
      const { responseData } = value;
      let metaplaylist;
      try {
        metaplaylist = JSON.parse(responseData) as IMetaPlaylist;
      } catch (err) {
        throw err;
      }
      if (metaplaylist.contents === undefined ||
          metaplaylist.contents.length === undefined ||
          metaplaylist.contents.length === 0) {
        throw new Error("createMetaplaylist: No duration on Metaplaylist content.");
      }
      const { contents } = metaplaylist;
      const lastEnd = contents[contents.length - 1].endTime;
      const firstStart = contents[0].startTime;
      return lastEnd - firstStart;
    })
  );
}

export default getDurationFromManifest;
