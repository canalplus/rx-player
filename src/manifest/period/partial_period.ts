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

import { IParsedPartialPeriod } from "../../parsers/manifest";
import IPeriodPrivateInfo from "./private_info";

/**
 * This class represents a or multiple LoadedPeriod objects which have not been
 * loaded yet.
 *
 * It can be seen as a placeholder for the real LoadedPeriod.
 *
 * @see LoadedPeriod
 * @class PartialPeriod
 */
export default class PartialPeriod {
  /** ID uniquely identifying the Period in the Manifest. */
  public readonly id : string;

  /** Constant to differentiate a `PartialPeriod` from a `LoadedPeriod` object. */
  public readonly isLoaded : false;

  /** URL at which the PartialPeriod can be loaded */
  public url? : string;

  /**
   * Duration of this Period, in seconds.
   * `undefined` for still-running Periods.
   */
  public duration? : number;

  /** Absolute start time of the Period, in seconds. */
  public start : number;

  /**
   * Absolute end time of the Period, in seconds.
   * `undefined` for still-running Periods.
   */
  public end? : number;

  /**
   * Optional information about the PartialPeriod, that can be used when loading
   * and parsing the resulting Period.
   * Its value depends on the transport used.
   * It is named "private" because this value won't be checked / modified by the
   * core logic. It is only used as a storage which can be exploited by the
   * parser and transport protocol implementation.
   */
  public privateInfos : IPeriodPrivateInfo;

  // To respect the v3.x.x Manifest API, we sadly have to add this
  // placeholder. It will never be equal to anything other than an empty
  // object here though.
  public adaptations : {};

  /**
   * @constructor
   * @param {Object} args
   * @param {} Observable
   */
  constructor(args : IParsedPartialPeriod) {
    this.id = args.id;
    this.duration = args.duration;
    this.start = args.start;
    if (this.duration != null && this.start != null) {
      this.end = this.start + this.duration;
    }
    this.url = args.url === null ? undefined :
                                   args.url;
    this.privateInfos = args.privateInfos === undefined ? {} :
                                                          args.privateInfos;
    this.isLoaded = false;
    this.adaptations = {};
  }
}
