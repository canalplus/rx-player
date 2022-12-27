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

import { IMetaPlaylist } from "../../../parsers/manifest/metaplaylist";
import getDurationFromManifest from "./get_duration_from_manifest";

interface IMetaplaylistContentInfos { url: string;
                                      transport: "dash" | "smooth";
                                      duration?: number; }

/**
 * From given information about wanted metaplaylist and contents,
 * get needed supplementary infos and build a standard metaplaylist.
 * @param {Array.<Object>} contentsInfos
 * @param {number|undefined} timeOffset
 * @returns {Promise<Object>} - metaplaylist
 */
function createMetaplaylist(
  contentsInfos: IMetaplaylistContentInfos[],
  timeOffset?: number
): Promise<IMetaPlaylist> {
  const playlistStartTime = timeOffset ?? 0;
  const completeContentsInfoProms = contentsInfos.map((contentInfos) => {
    const { url, transport, duration } = contentInfos;
    if (duration !== undefined) {
      return Promise.resolve({ url,
                               transport,
                               duration });
    }
    return getDurationFromManifest(url, transport).then((manifestDuration) => {
      return { url,
               duration: manifestDuration,
               transport };
    });
  });

  return Promise.all(completeContentsInfoProms).then((completeContentsInfos) => {
    const contents = completeContentsInfos
      .reduce((acc: Array<{ url: string;
                            transport: "dash" | "smooth" | "metaplaylist";
                            startTime: number;
                            endTime: number; }>,
               val) => {
        const lastElement = acc[acc.length - 1];
        const startTime = lastElement?.endTime ?? playlistStartTime;
        acc.push({ url: val.url,
                   transport: val.transport,
                   startTime,
                   endTime: startTime + val.duration });
        return acc;
      }, []);
    return { type: "MPL" as const,
             version: "0.1",
             dynamic: false,
             contents };
  });
}

export default createMetaplaylist;
