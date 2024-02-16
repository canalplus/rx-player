import MediaSourceContentInitializer from "../../main_thread/init/media_source_content_initializer";
/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMediaSourceMainFeature(features) {
    features.mainThreadMediaSourceInit = MediaSourceContentInitializer;
}
export { addMediaSourceMainFeature as MEDIA_SOURCE_MAIN };
export default addMediaSourceMainFeature;
