import addStableMultiThreadFeature from "../../features/list/multi_thread.ts";
import type { IFeaturesObject } from "../../features/types.ts";

/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMultiThreadFeature(features: IFeaturesObject): void {
  /* eslint-disable-next-line no-console */
  console.warn(
    "RxPlayer: `MULTI_THREAD` is no longer experimental.\n" +
      'You should now import it through the "rx-player/features" path. ' +
      "If you also rely on embedded worker assets, you should now import them through " +
      'the "rx-player/features/embeds" path.',
  );
  addStableMultiThreadFeature(features);
}

export { addMultiThreadFeature as MULTI_THREAD };
export default addMultiThreadFeature;
