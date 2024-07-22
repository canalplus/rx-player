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
import type { IManifest } from "../../../manifest";
import type { IParsedManifest } from "../types";
export type IParserResponse<T> = {
    type: "needs-manifest-loader";
    value: {
        ressources: Array<{
            url: string;
            transportType: string;
        }>;
        continue: (loadedRessources: IManifest[]) => IParserResponse<T>;
    };
} | {
    type: "done";
    value: T;
};
export interface IMetaPlaylistTextTrack {
    url: string;
    language: string;
    closedCaption: boolean;
    mimeType: string;
    codecs?: string;
}
export interface IMetaPlaylist {
    type: "MPL";
    version: string;
    dynamic?: boolean;
    pollInterval?: number;
    contents: Array<{
        url: string;
        startTime: number;
        endTime: number;
        transport: string;
        textTracks?: IMetaPlaylistTextTrack[];
    }>;
}
/**
 * Parse playlist string to JSON.
 * Returns an array of contents.
 * @param {string} data
 * @param {Object} parserOptions
 * @returns {Object}
 */
export default function parseMetaPlaylist(data: unknown, parserOptions: {
    url?: string | undefined;
    serverSyncInfos?: {
        serverTimestamp: number;
        clientTime: number;
    } | undefined;
}): IParserResponse<IParsedManifest>;
//# sourceMappingURL=metaplaylist_parser.d.ts.map