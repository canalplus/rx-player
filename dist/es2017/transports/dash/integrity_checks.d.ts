import type { ISegmentLoader, ITransportManifestPipeline } from "../types";
/**
 * Add multiple checks on the response given by the `segmentLoader` in argument.
 * If the response appear to be corrupted, the returned Promise will reject with
 * an error with an `INTEGRITY_ERROR` code.
 * @param {Function} segmentLoader
 * @returns {Function}
 */
export declare function addSegmentIntegrityChecks<T>(segmentLoader: ISegmentLoader<T>): ISegmentLoader<T>;
/**
 * Add multiple checks on the response given by the `manifestLoader` in argument.
 * If the response appear to be corrupted, the returned Promise will reject with
 * an error with an `INTEGRITY_ERROR` code.
 * @param {Function} manifestLoader
 * @returns {Function}
 */
export declare function addManifestIntegrityChecks(manifestLoader: ITransportManifestPipeline["loadManifest"]): ITransportManifestPipeline["loadManifest"];
//# sourceMappingURL=integrity_checks.d.ts.map