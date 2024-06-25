import { OtherError } from "../../errors";
import type { ILoadedManifestFormat } from "../../public_types";
import globalScope from "../../utils/global_scope";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import TaskCanceller from "../../utils/task_canceller";
import type { ISegmentLoader, ITransportManifestPipeline } from "../types";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity";
import inferSegmentContainer from "../utils/infer_segment_container";

/**
 * Add multiple checks on the response given by the `segmentLoader` in argument.
 * If the response appear to be corrupted, the returned Promise will reject with
 * an error with an `INTEGRITY_ERROR` code.
 * @param {Function} segmentLoader
 * @returns {Function}
 */
export function addSegmentIntegrityChecks<T>(
  segmentLoader: ISegmentLoader<T>,
): ISegmentLoader<T> {
  return (url, context, loaderOptions, initialCancelSignal, callbacks) => {
    return new Promise((resolve, reject) => {
      const requestCanceller = new TaskCanceller();
      const unlinkCanceller = requestCanceller.linkToSignal(initialCancelSignal);
      requestCanceller.signal.register(reject);

      segmentLoader(url, context, loaderOptions, requestCanceller.signal, {
        ...callbacks,
        onNewChunk(data) {
          try {
            trowOnIntegrityError(data);
            callbacks.onNewChunk(data);
          } catch (err) {
            // Do not reject with a `CancellationError` after cancelling the request
            cleanUpCancellers();

            // Cancel the request
            requestCanceller.cancel();

            // Reject with thrown error
            reject(err);
          }
        },
      }).then(
        (info) => {
          cleanUpCancellers();
          if (requestCanceller.isUsed()) {
            return;
          }
          if (info.resultType === "segment-loaded") {
            try {
              trowOnIntegrityError(info.resultData.responseData);
            } catch (err) {
              reject(err);
              return;
            }
          }
          resolve(info);
        },
        (err: unknown) => {
          cleanUpCancellers();
          reject(err);
        },
      );

      function cleanUpCancellers() {
        requestCanceller.signal.deregister(reject);
        unlinkCanceller();
      }
    });

    /**
     * If the data's seems to be corrupted, throws an `INTEGRITY_ERROR` error.
     * @param {*} data
     */
    function trowOnIntegrityError(data: T): void {
      if (
        (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) ||
        inferSegmentContainer(context.type, context.mimeType) !== "mp4"
      ) {
        return;
      }
      checkISOBMFFIntegrity(new Uint8Array(data), context.segment.isInit);
    }
  };
}

/**
 * Add multiple checks on the response given by the `manifestLoader` in argument.
 * If the response appear to be corrupted, the returned Promise will reject with
 * an error with an `INTEGRITY_ERROR` code.
 * @param {Function} manifestLoader
 * @returns {Function}
 */
export function addManifestIntegrityChecks(
  manifestLoader: ITransportManifestPipeline["loadManifest"],
): ITransportManifestPipeline["loadManifest"] {
  return async (url, options, initialCancelSignal) => {
    const res = await manifestLoader(url, options, initialCancelSignal);
    trowOnIntegrityError(res.responseData);
    return res;

    /**
     * If the data's seems to be corrupted, throws an `INTEGRITY_ERROR` error.
     * @param {*} data
     */
    function trowOnIntegrityError(data: ILoadedManifestFormat): void {
      if (typeof data === "string") {
        let currOffset = data.length - 1;
        while (isCharXmlWhiteSpace(data[currOffset])) {
          currOffset--;
        }
        if (data[currOffset] !== ">") {
          throw new OtherError("INTEGRITY_ERROR", "MPD does not end with </MPD>");
        }
        currOffset--;
        while (isCharXmlWhiteSpace(data[currOffset])) {
          currOffset--;
        }
        if (data.substring(currOffset - 2, currOffset + 1) !== "MPD") {
          throw new OtherError("INTEGRITY_ERROR", "MPD does not end with </MPD>");
        }
        currOffset -= 3;
        while (isCharXmlWhiteSpace(data[currOffset])) {
          currOffset--;
        }
        if (data.substring(currOffset - 1, currOffset + 1) !== "</") {
          throw new OtherError("INTEGRITY_ERROR", "MPD does not end with </MPD>");
        }
      } else if (data instanceof ArrayBuffer) {
        let currOffset = data.byteLength - 1;
        const dv = new DataView(data);
        while (isUtf8XmlWhiteSpace(dv.getUint8(currOffset))) {
          currOffset--;
        }
        if (dv.getUint8(currOffset) !== 0x3e) {
          throw new OtherError("INTEGRITY_ERROR", "MPD does not end with </MPD>");
        }
        currOffset--;
        while (isUtf8XmlWhiteSpace(dv.getUint8(currOffset))) {
          currOffset--;
        }
        if (
          dv.getUint8(currOffset - 2) !== 0x4d ||
          dv.getUint8(currOffset - 1) !== 0x50 ||
          dv.getUint8(currOffset) !== 0x44
        ) {
          throw new OtherError("INTEGRITY_ERROR", "MPD does not end with </MPD>");
        }
        currOffset -= 3;
        while (isUtf8XmlWhiteSpace(dv.getUint8(currOffset))) {
          currOffset--;
        }
        if (dv.getUint8(currOffset - 1) !== 0x3c || dv.getUint8(currOffset) !== 0x2f) {
          throw new OtherError("INTEGRITY_ERROR", "MPD does not end with </MPD>");
        }
      } else if (
        !isNullOrUndefined(globalScope.Document) &&
        data instanceof globalScope.Document
      ) {
        if (data.documentElement.nodeName !== "MPD") {
          throw new OtherError("INTEGRITY_ERROR", "MPD does not end with </MPD>");
        }
      }
    }
  };
}

/**
 * Returns `true` if the character given can be considered as
 * whitespace according to the XML spec.
 * @param {string} char
 * @returns {boolean}
 */
function isCharXmlWhiteSpace(char: string): boolean {
  return char === " " || char === "\t" || char === "\r" || char === "\n";
}

/**
 * Returns `true` if the character given can be considered as an ASCII
 * whitespace according to the HTML spec.
 * @param {string} char
 * @returns {boolean}
 */
function isUtf8XmlWhiteSpace(char: number): boolean {
  return char === 0x20 || char === 0x9 || char === 0xd || char === 0xa;
}
