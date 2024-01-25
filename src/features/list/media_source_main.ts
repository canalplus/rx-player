// eslint-disable-next-line max-len
import MediaSourceContentInitializer from "../../main_thread/init/media_source_content_initializer";
import type { IFeaturesObject } from "../types";

/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMediaSourceMainFeature(features : IFeaturesObject) : void {
  features.mainThreadMediaSourceInit = MediaSourceContentInitializer;
}

export { addMediaSourceMainFeature as MEDIA_SOURCE_MAIN };
export default addMediaSourceMainFeature;
