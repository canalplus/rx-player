// eslint-disable-next-line max-len
import MultiThreadContentInitializer from "../../core/init/multithread/main_thread/multi_thread_content_initializer";
import { IFeaturesObject } from "../../features/types";

/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMultiThreadFeature(features : IFeaturesObject) : void {
  features.multithread = { init: MultiThreadContentInitializer };

}

export { addMultiThreadFeature as MULTI_THREAD };
export default addMultiThreadFeature;

