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

import config from "../../config";
import { formatError } from "../../errors";
import features from "../../features";
import log from "../../log";
import Manifest from "../../manifest/classes";
import type {
  IDashParserResponse,
  ILoadedResource,
} from "../../parsers/manifest/dash/parsers_types";
import type { IPlayerError } from "../../public_types";
import objectAssign from "../../utils/object_assign";
import request from "../../utils/request";
import { strToUtf8, utf8ToStr } from "../../utils/string_parsing";
import type { CancellationSignal } from "../../utils/task_canceller";
import type {
  IManifestParserOptions,
  IManifestParserRequestScheduler,
  IManifestParserResult,
  IRequestedData,
  ITransportOptions,
} from "../types";

export default function generateManifestParser(
  options: ITransportOptions,
): (
  manifestData: IRequestedData<unknown>,
  parserOptions: IManifestParserOptions,
  onWarnings: (warnings: Error[]) => void,
  cancelSignal: CancellationSignal,
  scheduleRequest: IManifestParserRequestScheduler,
) => IManifestParserResult | Promise<IManifestParserResult> {
  const { referenceDateTime } = options;
  const serverTimeOffset =
    options.serverSyncInfos !== undefined
      ? options.serverSyncInfos.serverTimestamp - options.serverSyncInfos.clientTime
      : undefined;
  return function manifestParser(
    manifestData: IRequestedData<unknown>,
    parserOptions: IManifestParserOptions,
    onWarnings: (warnings: Error[]) => void,
    cancelSignal: CancellationSignal,
    scheduleRequest: IManifestParserRequestScheduler,
  ): IManifestParserResult | Promise<IManifestParserResult> {
    const { responseData } = manifestData;
    const argClockOffset = parserOptions.externalClockOffset;
    const url = manifestData.url ?? parserOptions.originalUrl;

    const externalClockOffset = serverTimeOffset ?? argClockOffset;
    const unsafelyBaseOnPreviousManifest = parserOptions.unsafeMode
      ? parserOptions.previousManifest
      : null;
    const dashParserOpts = {
      unsafelyBaseOnPreviousManifest,
      url,
      referenceDateTime,
      externalClockOffset,
    };

    const parsers = features.dashParsers;
    if (
      parsers.wasm === null ||
      parsers.wasm.status === "uninitialized" ||
      parsers.wasm.status === "failure"
    ) {
      log.debug("DASH: WASM MPD Parser not initialized. Running JS one.");
      return runDefaultJsParser();
    } else {
      const manifestAB = getManifestAsArrayBuffer(responseData);
      if (!doesXmlSeemsUtf8Encoded(manifestAB)) {
        log.info(
          "DASH: MPD doesn't seem to be UTF-8-encoded. " +
            "Running JS parser instead of the WASM one.",
        );
        return runDefaultJsParser();
      }

      if (parsers.wasm.status === "initialized") {
        log.debug("DASH: Running WASM MPD Parser.");
        const parsed = parsers.wasm.runWasmParser(manifestAB, dashParserOpts);
        return processMpdParserResponse(parsed);
      } else {
        log.debug("DASH: Awaiting WASM initialization before parsing the MPD.");
        const initProm = parsers.wasm.waitForInitialization().catch(() => {
          /* ignore errors, we will check the status later */
        });
        return initProm.then(() => {
          if (parsers.wasm === null || parsers.wasm.status !== "initialized") {
            log.warn(
              "DASH: WASM MPD parser initialization failed. " +
                "Running JS parser instead",
            );
            return runDefaultJsParser();
          }
          log.debug("DASH: Running WASM MPD Parser.");
          const parsed = parsers.wasm.runWasmParser(manifestAB, dashParserOpts);
          return processMpdParserResponse(parsed);
        });
      }
    }

    /**
     * Parse the MPD through the default JS-written parser (as opposed to the
     * WebAssembly one).
     * If it is not defined, throws.
     * @returns {Object|Promise.<Object>}
     */
    function runDefaultJsParser():
      | IManifestParserResult
      | Promise<IManifestParserResult> {
      if (parsers.js !== null) {
        const manifestStr = getManifestAsString(responseData);
        const parsedManifest = parsers.js(manifestStr, dashParserOpts);
        return processMpdParserResponse(parsedManifest);
      } else {
        throw new Error("No MPD parser is imported");
      }
    }

    /**
     * Process return of one of the MPD parser.
     * If it asks for a resource, load it then continue.
     * @param {Object} parserResponse - Response returned from a MPD parser.
     * @returns {Object|Promise.<Object>}
     */
    function processMpdParserResponse(
      parserResponse: IDashParserResponse<string> | IDashParserResponse<ArrayBuffer>,
    ): IManifestParserResult | Promise<IManifestParserResult> {
      if (parserResponse.type === "done") {
        if (parserResponse.value.warnings.length > 0) {
          onWarnings(parserResponse.value.warnings);
        }
        if (cancelSignal.isCancelled()) {
          return Promise.reject(cancelSignal.cancellationError);
        }
        const warnings: IPlayerError[] = [];
        const manifest = new Manifest(parserResponse.value.parsed, options, warnings);
        return { manifest, url, warnings };
      }

      const { value } = parserResponse;

      const externalResources = value.urls.map((resourceUrl) => {
        return scheduleRequest(() => {
          const defaultTimeout = config.getCurrent().DEFAULT_REQUEST_TIMEOUT;
          const defaultConnectionTimeout = config.getCurrent().DEFAULT_CONNECTION_TIMEOUT;

          return value.format === "string"
            ? request({
                url: resourceUrl,
                responseType: "text",
                timeout: defaultTimeout,
                connectionTimeout: defaultConnectionTimeout,
                cancelSignal,
              })
            : request({
                url: resourceUrl,
                responseType: "arraybuffer",
                timeout: defaultTimeout,
                connectionTimeout: defaultConnectionTimeout,
                cancelSignal,
              });
        }).then(
          (res) => {
            if (value.format === "string") {
              if (typeof res.responseData !== "string") {
                throw new Error("External DASH resources should have been a string");
              }
              return objectAssign(res, {
                responseData: {
                  success: true as const,
                  data: res.responseData,
                },
              });
            } else {
              if (!(res.responseData instanceof ArrayBuffer)) {
                throw new Error("External DASH resources should have been ArrayBuffers");
              }
              return objectAssign(res, {
                responseData: {
                  success: true as const,
                  data: res.responseData,
                },
              });
            }
          },
          (err) => {
            const error = formatError(err, {
              defaultCode: "PIPELINE_PARSE_ERROR",
              defaultReason: "An unknown error occured when parsing ressources.",
            });
            return objectAssign(
              {},
              {
                size: undefined,
                requestDuration: undefined,
                responseData: {
                  success: false as const,
                  error,
                },
              },
            );
          },
        );
      });

      return Promise.all(externalResources).then((loadedResources) => {
        if (value.format === "string") {
          assertLoadedResourcesFormatString(loadedResources);
          return processMpdParserResponse(value.continue(loadedResources));
        } else {
          assertLoadedResourcesFormatArrayBuffer(loadedResources);
          return processMpdParserResponse(value.continue(loadedResources));
        }
      });
    }
  };
}

/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 *
 * @param loadedResource
 * @returns
 */
function assertLoadedResourcesFormatString(
  loadedResources: Array<ILoadedResource<string | ArrayBuffer>>,
): asserts loadedResources is Array<ILoadedResource<string>> {
  if (
    (__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.PRODUCTION as number)
  ) {
    return;
  }
  loadedResources.forEach((loadedResource) => {
    const { responseData } = loadedResource;
    if (responseData.success && typeof responseData.data === "string") {
      return;
    } else if (!responseData.success) {
      return;
    }
    throw new Error("Invalid data given to the LoadedRessource");
  });
}

/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 *
 * @param loadedResource
 * @returns
 */
function assertLoadedResourcesFormatArrayBuffer(
  loadedResources: Array<ILoadedResource<string | ArrayBuffer>>,
): asserts loadedResources is Array<ILoadedResource<ArrayBuffer>> {
  if (
    (__ENVIRONMENT__.CURRENT_ENV as number) === (__ENVIRONMENT__.PRODUCTION as number)
  ) {
    return;
  }

  loadedResources.forEach((loadedResource) => {
    const { responseData } = loadedResource;
    if (responseData.success && responseData.data instanceof ArrayBuffer) {
      return;
    } else if (!responseData.success) {
      return;
    }
    throw new Error("Invalid data given to the LoadedRessource");
  });
}

/**
 * Try to convert a Manifest from an unknown format to an array of nodes as
 * parsed by our XML DOM parser.
 *
 * Throws if the format cannot be converted.
 * @param {*} manifestSrc
 * @returns {Array.<Object | string>}
 */
function getManifestAsString(manifestSrc: unknown): string {
  if (manifestSrc instanceof ArrayBuffer) {
    return utf8ToStr(new Uint8Array(manifestSrc));
  } else if (typeof manifestSrc === "string") {
    return manifestSrc;
  } else if (manifestSrc instanceof Document) {
    return manifestSrc.documentElement.outerHTML;
  } else {
    throw new Error("DASH Manifest Parser: Unrecognized Manifest format");
  }
}

/**
 * Try to convert a Manifest from an unknown format to an `ArrayBuffer` format.
 * Throws if the format cannot be converted.
 * @param {*} manifestSrc
 * @returns {ArrayBuffer}
 */
function getManifestAsArrayBuffer(manifestSrc: unknown): ArrayBuffer {
  if (manifestSrc instanceof ArrayBuffer) {
    return manifestSrc;
  } else if (typeof manifestSrc === "string") {
    return strToUtf8(manifestSrc).buffer;
  } else if (manifestSrc instanceof Document) {
    return strToUtf8(manifestSrc.documentElement.innerHTML).buffer;
  } else {
    throw new Error("DASH Manifest Parser: Unrecognized Manifest format");
  }
}

/**
 * Returns true if the given XML appears to be encoded in UTF-8.
 *
 * For now, this function can return a lot of false positives, but it should
 * mostly work with real use cases.
 * @param {ArrayBuffer} xmlData
 * @returns {boolean}
 */
function doesXmlSeemsUtf8Encoded(xmlData: ArrayBuffer): boolean {
  const dv = new DataView(xmlData);
  if (dv.getUint16(0) === 0xefbb && dv.getUint8(2) === 0xbf) {
    // (UTF-8 BOM)
    return true;
  } else if (dv.getUint16(0) === 0xfeff || dv.getUint16(0) === 0xfffe) {
    // (UTF-16 BOM)
    return false;
  }

  // TODO check encoding from request mimeType and text declaration?
  // https://www.w3.org/TR/xml/#sec-TextDecl
  return true;
}
