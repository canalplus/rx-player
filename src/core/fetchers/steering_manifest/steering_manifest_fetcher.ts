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

import config from "../../../config";
import { formatError } from "../../../errors";
import { ISteeringManifest } from "../../../parsers/SteeringManifest";
import { IPlayerError } from "../../../public_types";
import {
  IRequestedData,
  ITransportSteeringManifestPipeline,
} from "../../../transports";
import { CancellationSignal } from "../../../utils/task_canceller";
import errorSelector from "../utils/error_selector";
import {
  IBackoffSettings,
  scheduleRequestPromise,
} from "../utils/schedule_request";

/** Response emitted by a SteeringManifestFetcher fetcher. */
export type ISteeringManifestParser =
  /** Allows to parse a fetched Steering Manifest into a `ISteeringManifest` structure. */
  (onWarnings : ((warnings : IPlayerError[]) => void)) => ISteeringManifest;

/** Options used by the `SteeringManifestFetcher`. */
export interface ISteeringManifestFetcherSettings {
  /** Maximum number of time a request on error will be retried. */
  maxRetryRegular : number | undefined;
  /** Maximum number of time a request be retried when the user is offline. */
  maxRetryOffline : number | undefined;
}

/**
 * Class allowing to facilitate the task of loading and parsing a Content
 * Steering Manifest, which is an optional document associated to a content,
 * communicating the priority between several CDN.
 * @class SteeringManifestFetcher
 */
export default class SteeringManifestFetcher {
  private _settings : ISteeringManifestFetcherSettings;
  private _pipelines : ITransportSteeringManifestPipeline;

  /**
   * Construct a new SteeringManifestFetcher.
   * @param {Object} pipelines - Transport pipelines used to perform the
   * Content Steering Manifest loading and parsing operations.
   * @param {Object} settings - Configure the `SteeringManifestFetcher`.
   */
  constructor(
    pipelines : ITransportSteeringManifestPipeline,
    settings : ISteeringManifestFetcherSettings
  ) {
    this._pipelines = pipelines;
    this._settings = settings;
  }

  /**
   * (re-)Load the Content Steering Manifest.
   * This method does not yet parse it, parsing will then be available through
   * a callback available on the response.
   *
   * You can set an `url` on which that Content Steering Manifest will be
   * requested.
   * If not set, the regular Content Steering Manifest url - defined on the
   * `SteeringManifestFetcher` instanciation - will be used instead.
   *
   * @param {string|undefined} url
   * @param {Function} onRetry
   * @param {Object} cancelSignal
   * @returns {Promise}
   */
  public async fetch(
    url : string,
    onRetry : (error : IPlayerError) => void,
    cancelSignal : CancellationSignal
  ) : Promise<ISteeringManifestParser> {
    const pipelines = this._pipelines;
    const backoffSettings = this._getBackoffSetting((err) => {
      onRetry(errorSelector(err));
    });
    const callLoader = () => pipelines.loadSteeringManifest(url, cancelSignal);
    const response = await scheduleRequestPromise(callLoader,
                                                  backoffSettings,
                                                  cancelSignal);
    return (onWarnings : ((error : IPlayerError[]) => void)) => {
      return this._parseSteeringManifest(response, onWarnings);
    };
  }

  /**
   * Parse an already loaded Content Steering Manifest.
   *
   * This method should be reserved for Content Steering Manifests for which no
   * request has been done.
   * In other cases, it's preferable to go through the `fetch` method, so
   * information on the request can be used by the parsing process.
   * @param {*} steeringManifest
   * @param {Function} onWarnings
   * @returns {Observable}
   */
  public parse(
    steeringManifest : unknown,
    onWarnings : (error : IPlayerError[]) => void
  ) : ISteeringManifest {
    return this._parseSteeringManifest({ responseData: steeringManifest,
                                         size: undefined,
                                         requestDuration: undefined },
                                       onWarnings);
  }

  /**
   * Parse a Content Steering Manifest.
   * @param {Object} loaded - Information about the loaded Content Steering Manifest.
   * @param {Function} onWarnings
   * @returns {Observable}
   */
  private _parseSteeringManifest(
    loaded : IRequestedData<unknown>,
    onWarnings : (error : IPlayerError[]) => void
  ) : ISteeringManifest {
    try {
      return this._pipelines.parseSteeringManifest(
        loaded,
        function onTransportWarnings(errs) {
          const warnings = errs.map(e => formatParsingError(e));
          onWarnings(warnings);
        }
      );
    } catch (err) {
      throw formatParsingError(err);
    }

    /**
     * Format the given Error and emit it through `obs`.
     * Either through a `"warning"` event, if `isFatal` is `false`, or through
     * a fatal Observable error, if `isFatal` is set to `true`.
     * @param {*} err
     * @returns {Error}
     */
    function formatParsingError(err : unknown) : IPlayerError {
      return formatError(err, {
        defaultCode: "PIPELINE_PARSE_ERROR",
        defaultReason: "Unknown error when parsing the Content Steering Manifest",
      });
    }
  }

  /**
   * Construct "backoff settings" that can be used with a range of functions
   * allowing to perform multiple request attempts
   * @param {Function} onRetry
   * @returns {Object}
   */
  private _getBackoffSetting(onRetry : (err : unknown) => void) : IBackoffSettings {
    const { DEFAULT_MAX_CONTENT_STEERING_MANIFEST_REQUEST_RETRY,
            DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
            INITIAL_BACKOFF_DELAY_BASE,
            MAX_BACKOFF_DELAY_BASE } = config.getCurrent();
    const { maxRetryRegular : ogRegular,
            maxRetryOffline : ogOffline } = this._settings;
    const baseDelay = INITIAL_BACKOFF_DELAY_BASE.REGULAR;
    const maxDelay = MAX_BACKOFF_DELAY_BASE.REGULAR;
    const maxRetryRegular = ogRegular ??
                            DEFAULT_MAX_CONTENT_STEERING_MANIFEST_REQUEST_RETRY;
    const maxRetryOffline = ogOffline ?? DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE;
    return { onRetry,
             baseDelay,
             maxDelay,
             maxRetryRegular,
             maxRetryOffline };
  }
}
