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

import pinkie from "pinkie";
import {
  EMPTY,
  from as observableFrom,
  of as observableOf,
} from "rxjs";
import {
  concatMap,
  mergeMap,
  scan,
} from "rxjs/operators";
import { IMetaPlaylist } from "../../../parsers/manifest/metaplaylist";
import getManifest from "./get_manifest";

const PPromise = typeof Promise !== undefined ? Promise :
                                                pinkie;

interface IMetaplaylistMetadata { version: "0.1";
                                  data: { dynamic?: boolean;
                                          pollInterval?: number; }; }

interface IMetaplaylistContentInfos { url: string;
                                      transport: "dash" | "smooth";
                                      duration?: number; }

/**
 * From given information about wanted metaplaylist and contents,
 * get needed supplementary infos and build a standard metaplaylist.
 * @param {Object} metadata
 * @param {Array.<Object>} contentsInfos
 * @returns {Promise<Object>} - metaplaylist
 */
function createMetaplaylist(metadata: IMetaplaylistMetadata,
                            contentsInfos: IMetaplaylistContentInfos[]
): Promise<IMetaPlaylist> {
  if (metadata.version !== "0.1") {
    return PPromise.reject("Metaplaylist Maker : Unsupported metaplaylist version.");
  }
  return observableFrom(contentsInfos).pipe(
    concatMap(({ url, transport }) => {
      return getManifest(url, transport).pipe(
        mergeMap((manifest) => {
          if (manifest.isDynamic || manifest.isLive) {
            return EMPTY;
          }
          const duration = manifest.getMaximumPosition() -
                           manifest.getMinimumPosition();
          return observableOf({ url,
                                duration,
                                transport });
        })
      );
    }),
    scan((acc: IMetaPlaylist, val) => {
      const { contents } = acc;
      const lastElement = contents[contents.length - 1];
      const lastStart = lastElement?.endTime ?? 0;
      contents.push({ url: val.url,
                      transport: val.transport,
                      startTime: lastStart,
                      endTime: lastStart + val.duration });
      return acc;
    }, { type: "MPL" as const,
         version: "0.1",
         dynamic: metadata.data.dynamic,
         pollInterval: metadata.data.pollInterval,
         contents: [] }
    )
  ).toPromise(PPromise);
}

export default createMetaplaylist;
