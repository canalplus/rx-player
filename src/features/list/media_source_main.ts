import MultiThreadContentInitializer from "../../main_thread/init/multi_thread_content_initializer";
import type { IFeaturesObject } from "../types";

/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMediaSourceMainFeature(features: IFeaturesObject): void {
  features.mainThreadMediaSourceInit = MultiThreadContentInitializer;
}

export { addMediaSourceMainFeature as MEDIA_SOURCE_MAIN };
export default addMediaSourceMainFeature;
