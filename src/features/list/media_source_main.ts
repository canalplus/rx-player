import initializeCoreEntry from "../../core/entry/index.ts";
import { MonoThreadCoreInterface } from "../../main_thread/core_interface/monothread.ts";
import MediaSourceContentInitializer from "../../main_thread/init/media_source_content_initializer.ts";
import type { IFeaturesObject } from "../types.ts";

/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMediaSourceMainFeature(features: IFeaturesObject): void {
  features.monothread = {
    init: MediaSourceContentInitializer,
    coreInterface: MonoThreadCoreInterface,
    initializeCoreEntry,
  };
}

export { addMediaSourceMainFeature as MEDIA_SOURCE_MAIN };
export default addMediaSourceMainFeature;
