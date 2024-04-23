import type { IFeaturesObject } from "../types";
/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
declare function addMediaSourceMainFeature(features: IFeaturesObject): void;
export { addMediaSourceMainFeature as MEDIA_SOURCE_MAIN };
export default addMediaSourceMainFeature;
