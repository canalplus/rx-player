import startsWith from "../utils/starts_with.ts";
import { getChromeVersion } from "./browser_version.ts";

/**
 * This function returns true if the potential `dvcC` ISOBMFF box should be
 * removed from a segment.
 *
 * Explanation:
 *
 * We had a problem for some years on LG devices with retro-compatible
 * Dolby Vision contents (e.g. which, when Dolby Vision is found to not
 * be compatible to the device, is actually announced as e.g. hevc instead,
 * with the RxPlayer knowing its compatible to both thanks to DASH
 * supplementalCodecs + codecs signaling).
 *
 * Those failed to play, presumably because the device still noticed the
 * Dolby Vision metadata, even though we did not want to play it as Dolby
 * Vision.
 *
 * We found out more recently that this issue has been known by Dolby, seems
 * to affect Chrome version < 94, and even proposed a generic work-around for
 * everybody:
 * https://professionalsupport.dolby.com/s/article/Guidelines-to-developers-building-DASH-HLS-player-apps-for-LG-WebOS-Chromecast-and-other-Chromium-based-app-development-platforms?language=en_US
 *
 * @param {Array.<string>} codecs
 * @returns {Boolean}
 */
export default function shouldPatchOutDolbyVisionConfigDataFromMp4(
  codecs: string[],
  chosenCodec: string | undefined,
): boolean {
  const chromeVersion = getChromeVersion();
  // Seen to affect older LG device with a chrome version inferior to 94
  if (chromeVersion === null || chromeVersion >= 94) {
    return false;
  }
  const hasDolbyVision = codecs.some(
    (c) => startsWith(c, "dvh1") || startsWith(c, "dvhe"),
  );
  if (!hasDolbyVision) {
    // NOTE: Technically we could still have a dvcC box here, shouldn't we patch it out
    // regardless when not playing Dolby Vision? I'm unsure...
    return false;
  }
  return (
    chosenCodec !== undefined &&
    !startsWith(chosenCodec, "dvh1") &&
    !startsWith(chosenCodec, "dvhe")
  );
}
