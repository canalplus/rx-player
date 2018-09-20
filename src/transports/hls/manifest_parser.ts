import { formatError } from "../../errors";
import Manifest from "../../manifest/classes";
import parseMasterPlaylist from "../../parsers/manifest/hls";
import type { IHLSPlaylistParserResponse } from "../../parsers/manifest/hls";
import type { IPlayerError } from "../../public_types";
import objectAssign from "../../utils/object_assign";
import request from "../../utils/request";
import type { IRequestResponse } from "../../utils/request";
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
    _onWarnings: (warnings: Error[]) => void,
    _cancelSignal: CancellationSignal,
    scheduleRequest: IManifestParserRequestScheduler,
  ): IManifestParserResult | Promise<IManifestParserResult> {
    const argClockOffset = parserOptions.externalClockOffset;
    const url = manifestData.url ?? parserOptions.originalUrl;
    if (typeof manifestData.responseData !== "string") {
      throw new Error("HLS data should always be a string");
    }
    const data = manifestData.responseData;

    const externalClockOffset = serverTimeOffset ?? argClockOffset;
    const parsedManifest = parseMasterPlaylist(data, {
      url,
      referenceDateTime,
      externalClockOffset,
    });
    return loadExternalResources(parsedManifest);

    function loadExternalResources(
      parserResponse: IHLSPlaylistParserResponse,
    ): IManifestParserResult | Promise<IManifestParserResult> {
      if (parserResponse.type === "done") {
        // if (parserResponse.value.warnings.length > 0) {
        //   onWarnings(parserResponse.value.warnings);
        // }
        const warnings: IPlayerError[] = [];
        const manifest = new Manifest(parserResponse.value, options, warnings);
        return { manifest, url, warnings };
      }

      const { ressources, continue: continueParsing } = parserResponse.value;

      const externalResources = ressources.map((resource) =>
        scheduleRequest(() => requestStringResource(resource)).then(
          (res) => {
            if (typeof res.responseData !== "string") {
              throw new Error("External DASH resources should have been a string");
            }
            return objectAssign(res, {
              responseData: {
                success: true as const,
                data: res.responseData,
              },
            });
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
        ),
      );

      return Promise.all(externalResources).then((loadedResources) => {
        const formattedResources = [];
        for (let i = 0; i < loadedResources.length; i++) {
          const resource = loadedResources[i];
          // TODO
          if (!resource.responseData.success) {
            throw new Error("Could not fetch one of HLS subresources");
          }
          formattedResources.push({
            url: ressources[i],
            responseData: resource.responseData.data,
          });
        }
        return loadExternalResources(continueParsing(formattedResources));
      });
    }
  };
}

/**
 * Request external "xlink" ressource from a MPD.
 * @param {string} xlinkURL
 * @returns {Observable}
 */
function requestStringResource(url: string): Promise<IRequestResponse<string, "text">> {
  return request({ url, responseType: "text" });
}
