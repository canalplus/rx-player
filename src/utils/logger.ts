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

import EventEmitter from "./event_emitter.ts";
import getMonotonicTimeStamp from "./monotonic_timestamp.ts";
import noop from "./noop.ts";

export type ILoggerLevel = "NONE" | "ERROR" | "WARNING" | "INFO" | "DEBUG";

export type ILogFormat = "standard" | "full";

type IAcceptedLogValueBase = boolean | string | number | null | undefined;
export type IAcceptedLogValue =
  | IAcceptedLogValueBase
  | Error
  | Partial<Record<string, IAcceptedLogValueBase>>;

/**
 * Area of the code the log is linked to.
 *
 * Do not forget to update the corresponding API documentation page. When adding
 * or removing namespaces.
 */
export type ILogNamespace =
  /** Linked to adaptive bitrate quality selection */
  | "ABR"
  /** Linked to the RxPlayer public API. */
  | "API"
  /** Linked to the part of the RxPlayer handling audio/video/text track selection. */
  | "Track"
  /**
   * Linked to the "Init" logic of the RxPlayer, which between other things set up a
   * new content.
   */
  | "Init"
  /**
   * Global handling logic in the "Core" part of the player.
   * The main orchestrator in the RxPlayer's worker-side.
   */
  | "Core"
  /** Linked to logic implementing Manifest Fetching. */
  | "MF"
  /** Linked to logic implementing Segment Fetching. */
  | "SF"
  /** Linked to a generic utils function. */
  | "utils"
  /** Linked to CMCD logic. */
  | "CMCD"
  /** Heuristics involved in freeze-detection (when the media is stalled unexpectedly). */
  | "Freeze"
  /** Linked to the DASH protocol implementation and manifest parsing. */
  | "dash"
  /** Linked to the Smooth protocol implementation and manifest parsing. */
  | "smooth"
  /** Linked to the MetaPlaylist protocol implementation and manifest parsing. */
  | "metaplaylist"
  /** Linked to the exploitation of the `HTMLMediaElement` linked to the RxPlayer. */
  | "media"
  /** Linked to the code directly interacting with MSE API, e.g. to append media data. */
  | "mse"
  /** Linked to the code handling content decryption, including handling the EME API. */
  | "DRM"
  /** "Segment Inventory". Estimates the list of segment currently present in buffers, */
  | "SI"
  /** Core RxPlayer logic orchestrating segment fetching and pushing. */
  | "Stream"
  /** Linked to the code handling the "Manifest" structure, which describes a content. */
  | "manifest"
  /** Linked to the logic parsing ISOBMFF-compatible container files. */
  | "isobmff"
  /** Linked to the logic parsing MKV-compatible container files. */
  | "webm"
  /** Linked to the logic parsing TTML data, for text tracks. */
  | "ttml"
  /** Linked to the logic parsing VTT data, for text tracks. */
  | "vtt"
  /** Linked to the logic parsing SRT data, for text tracks. */
  | "srt"
  /** Linked to the logic parsing SAMI data, for text tracks. */
  | "sami"
  /** Linked to in-stream image thumbnails. */
  | "Thumbnails"
  /** Linked to subtitles / text management */
  | "text"
  /**
   * Message sent from the RxPlayer's "main" part logic (e.g. the API) to the "Core"
   * internal logic.
   * Both may run in parallel (in "multithreading" mode).
   */
  | "M-->C"
  /**
   * Message sent from the RxPlayer's "Core" logic to the "main" logic.
   * Both may run in parallel (in "multithreading" mode).
   */
  | "M<--C"
  /** Log from the `MediaCapabilitiesProber` tool. */
  | "MediaCapabilitiesProber"
  /** Log from the `VideoThumbnailLoader` tool. */
  | "VideoThumbnailLoader";

type IConsoleFn = (namespace: ILogNamespace, ...args: IAcceptedLogValue[]) => void;

const DEFAULT_LOG_LEVEL: ILoggerLevel = "NONE";

/**
 * Events sent by `Logger` where the keys are the events' name and the values
 * are the corresponding payloads.
 */
interface ILoggerEvents {
  onLogLevelChange: {
    level: ILoggerLevel;
    format: ILogFormat;
  };
}

/**
 * Logger implementation.
 * @class Logger
 */
export default class Logger extends EventEmitter<ILoggerEvents> {
  public error: IConsoleFn;
  public warn: IConsoleFn;
  public info: IConsoleFn;
  public debug: IConsoleFn;
  private _currentLevel: ILoggerLevel;
  private _currentFormat: ILogFormat;
  private readonly _levels: Record<ILoggerLevel, number>;

  constructor() {
    super();
    this.error = noop;
    this.warn = noop;
    this.info = noop;
    this.debug = noop;
    this._levels = { NONE: 0, ERROR: 1, WARNING: 2, INFO: 3, DEBUG: 4 };
    this._currentFormat = "standard";
    this._currentLevel = DEFAULT_LOG_LEVEL;
  }

  /**
   * Update the logger's level to increase or decrease its verbosity, to change
   * its format with a newly set one, or to update its logging function.
   * @param {string} levelStr - One of the [upper-case] logger level. If the
   * given level is not valid, it will default to `"NONE"`.
   * @param {function|undefined} [logFn] - Optional logger function which will
   * be called with logs (with the corresponding upper-case logger level as
   * first argument).
   * Can be omited to just rely on regular logging functions.
   */
  public setLevel(
    levelStr: string,
    format: string,
    logFn?: (
      levelStr: ILoggerLevel,
      namespace: string,
      logs: IAcceptedLogValue[],
    ) => void,
  ): void {
    let level: number;
    const foundLevel = this._levels[levelStr as ILoggerLevel];
    if (typeof foundLevel === "number") {
      level = foundLevel;
      this._currentLevel = levelStr as ILoggerLevel;
    } else {
      // not found
      level = 0;
      this._currentLevel = "NONE";
    }

    let actualFormat: ILogFormat;
    if (format === "standard" || format === "full") {
      actualFormat = format;
    } else {
      actualFormat = "standard";
    }
    if (actualFormat === "full" && actualFormat !== this._currentFormat) {
      // Add the current Date so we can see at which time logs are displayed
      const now = getMonotonicTimeStamp();
      // eslint-disable-next-line no-console
      console.log(String(now.toFixed(2)), "[Init]", `Local-Date: ${Date.now()}`);
    }
    this._currentFormat = actualFormat;

    const generateLogFn =
      this._currentFormat === "full"
        ? (logMethod: string, consoleFn: (...vals: unknown[]) => void): IConsoleFn => {
            return (namespace: ILogNamespace, ...args: IAcceptedLogValue[]) => {
              const now = getMonotonicTimeStamp();
              return consoleFn(
                String(now.toFixed(2)),
                `[${logMethod}]`,
                namespace + ":",
                ...args.map((a) =>
                  typeof a === "object" && a !== null && !(a instanceof Error)
                    ? formatContextObject(a)
                    : a,
                ),
              );
            };
          }
        : (_logMethod: string, consoleFn: (...vals: unknown[]) => void): IConsoleFn => {
            return (namespace: ILogNamespace, ...args: IAcceptedLogValue[]) => {
              return consoleFn(
                namespace + ":",
                ...args.map((a) =>
                  typeof a === "object" && a !== null && !(a instanceof Error)
                    ? formatContextObject(a)
                    : a,
                ),
              );
            };
          };

    if (logFn === undefined) {
      /* eslint-disable no-console */
      this.error =
        level >= this._levels.ERROR
          ? generateLogFn("error", console.error.bind(console))
          : noop;
      this.warn =
        level >= this._levels.WARNING
          ? generateLogFn("warn", console.warn.bind(console))
          : noop;
      this.info =
        level >= this._levels.INFO
          ? generateLogFn("info", console.info.bind(console))
          : noop;
      this.debug =
        level >= this._levels.DEBUG
          ? generateLogFn("log", console.log.bind(console))
          : noop;
      /* eslint-enable no-console */
    } else {
      const produceLogFn = (logLevel: ILoggerLevel): IConsoleFn => {
        return level >= this._levels[logLevel]
          ? (namespace: ILogNamespace, ...args: IAcceptedLogValue[]) => {
              return logFn(logLevel, namespace, args);
            }
          : noop;
      };
      this.error = produceLogFn("ERROR");
      this.warn = produceLogFn("WARNING");
      this.info = produceLogFn("INFO");
      this.debug = produceLogFn("DEBUG");
    }

    this.trigger("onLogLevelChange", {
      level: this._currentLevel,
      format: this._currentFormat,
    });
  }

  /**
   * Get the last set logger level, as an upper-case string value.
   * @returns {string}
   */
  public getLevel(): ILoggerLevel {
    return this._currentLevel;
  }

  /**
   * Get the last set logger's log format.
   * @returns {string}
   */
  public getFormat(): ILogFormat {
    return this._currentFormat;
  }

  /**
   * Returns `true` if the currently set level includes logs of the level given
   * in argument.
   * @param {string} logLevel
   * @returns {boolean}
   */
  public hasLevel(logLevel: ILoggerLevel): boolean {
    return this._levels[logLevel] >= this._levels[this._currentLevel];
  }
}

function formatContextObject(obj: Partial<Record<string, IAcceptedLogValue>>) {
  let ret = "";
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (ret.length > 0) {
        ret += " ";
      }
      const val = obj[key];
      if (val instanceof Error) {
        ret += `${key}="${JSON.stringify(val?.toString())}"`;
      } else {
        ret += `${key}=${typeof val === "string" ? `${JSON.stringify(val)}` : String(val)}`;
      }
    }
  }
  return ret;
}
