import { WorkerCoreInterface } from "../../main_thread/core_interface/multithread.ts";
import MediaSourceContentInitializer from "../../main_thread/init/media_source_content_initializer.ts";
import type { IFeaturesObject } from "../types.ts";

/**
 * Add ability to run the RxPlayer's main buffering logic in a WebWorker.
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
