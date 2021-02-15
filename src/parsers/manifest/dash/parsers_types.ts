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

import { IParsedManifest } from "../types";

export { IMPDParserArguments } from "./common";

/** Response returned by a DASH MPD parser. */
export type IDashParserResponse<T extends string | ArrayBuffer> =
  IDashParserNeedsResources<T> |
  IDashParserResponseDone;

/** Response when the MPD parser has been able to parse the whole MPD. */
export interface IDashParserResponseDone {
  /** Identify this type of response. */
  type : "done";
  value : {
    /** The parsed MPD under a IParsedManifest format. */
    parsed : IParsedManifest;
    /** Non-fatal errors encountered when parsing the MPD. */
    warnings : Error[];
  };
}

/**
 * Response when the MPD parser needs to load some resources before continuing
 * parsing the MPD.
 */
export interface IDashParserNeedsResources<T extends string | ArrayBuffer> {
  /** Identify this type of response. */
  type : "needs-resources";
  value : {
    /** The URLs of each needed resource. */
    urls : string[];
    /** The format under which all those resources should be loaded. */
    format : T extends string ? "string" :
                                "arraybuffer";
    /**
     * Callback to call with the fetched resources data in argument to continue
     * parsing the MPD.
     *
     * The element of the `loadedResources` array should be in the same order
     * than the resources in the `urls` array.
     */
    continue : (
      loadedResources : Array<ILoadedResource<T>>
    ) => IDashParserResponse<string> | IDashParserResponse<ArrayBuffer>;
  };
}

/** Format a loaded resource should take. */
export interface ILoadedResource<T extends string | ArrayBuffer> {
  /**
   * The URL of the loaded resource (post-redirection if one).
   * `undefined` if unknown or inexistant.
   */
  url? : string;
  /**
   * The time, in terms of `performance.now()`, at which the resource was
   * starting to be fetched.
   * `undefined` if unknown or not applicable.
   */
  sendingTime? : number;
  /**
   * The time, in terms of `performance.now()`, at which the resource was
   * fully-fetched.
   * `undefined` if unknown or not applicable.
   */
  receivedTime? : number;
  /** The loaded resource itself, under the right format. */
  responseData : T;
}
