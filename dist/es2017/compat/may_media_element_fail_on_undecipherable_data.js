import { isPlayStation5 } from "./browser_detection";
/**
 * We noticed that the PlayStation 5 may have the HTMLMediaElement on which the
 * content is played stop on a `MEDIA_ERR_DECODE` error if it encounters
 * encrypted media data whose key is not usable due to policy restrictions (the
 * most usual issue being non-respect of HDCP restrictions).
 *
 * This is not an usual behavior, other platforms just do not attempt to decode
 * the encrypted media data and stall the playback instead (which is a much
 * preferable behavior for us as we have some advanced mechanism to restart
 * playback when this happens).
 *
 * Consequently, we have to specifically consider platforms with that
 * fail-on-undecipherable-data issue, to perform a work-around in that case.
 */
const mayMediaElementFailOnUndecipherableData = isPlayStation5;
export default mayMediaElementFailOnUndecipherableData;
