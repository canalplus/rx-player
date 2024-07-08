import type { IFeaturesObject } from "../../features/types";
import MultiThreadContentInitializer from "../../main_thread/init/multi_thread_content_initializer";

/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMultiThreadFeature(features: IFeaturesObject): void {
  features.multithread = { init: MultiThreadContentInitializer };
}

export { addMultiThreadFeature as MULTI_THREAD };
export default addMultiThreadFeature;
