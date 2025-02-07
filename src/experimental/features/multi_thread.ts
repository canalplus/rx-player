import type { IFeaturesObject } from "../../features/types";
import { WorkerCoreInterface } from "../../main_thread/core_interface/multithread";
import MediaSourceContentInitializer from "../../main_thread/init/media_source_content_initializer";

/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMultiThreadFeature(features: IFeaturesObject): void {
  features.multithread = {
    init: MediaSourceContentInitializer,
    coreInterface: WorkerCoreInterface,
  };
}

export { addMultiThreadFeature as MULTI_THREAD };
export default addMultiThreadFeature;
