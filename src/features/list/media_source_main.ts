import initializeWorkerMain from "../../core/main/worker";
import { MonoThreadCoreInterface } from "../../main_thread/core_interface/monothread";
import MultiThreadContentInitializer from "../../main_thread/init/multi_thread_content_initializer";
import type { IFeaturesObject } from "../types";

/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMediaSourceMainFeature(features: IFeaturesObject): void {
  features.monothread = {
    init: MultiThreadContentInitializer,
    coreInterface: MonoThreadCoreInterface,
    workerMain: initializeWorkerMain,
  };
}

export { addMediaSourceMainFeature as MEDIA_SOURCE_MAIN };
export default addMediaSourceMainFeature;
