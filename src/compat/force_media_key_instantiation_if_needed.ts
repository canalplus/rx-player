import log from "../log.ts";
import arrayIncludes from "../utils/array_includes.ts";
import type {
  IMediaKeys,
  IMediaKeySession,
  IMediaKeySystemAccess,
} from "./browser_compatibility_types.ts";
import EnvDetector from "./env_detector.ts";
import { getDummyInitDataForKeySystem } from "./generate_init_data.ts";

/**
 * 2026-09-18: A few devices on windows 11 and PlayReady (both SL2000 and SL3000)
 * couldn't play contents with clear segments in them if the `MediaKeys` never had at that
 * point either a `generateRequest` nor a `setServerCertificate` call on them, it would
 * keep stalling indefinitely (and `readyState` to `1` despite having clear buffered
 * data around `currentTime`).
 * The trick of calling `generateRequest` / `setServerCertificate` was an idea coming from
 * Microsoft, telling us that this "initialized" the `MediaKeys` which make the bug
 * dissapear.
 * They still admitted it was a bug that would be resolved in ~early 2027.
 *
 * TODO: generalize `generateRequest` approach in a heuristic somewhere, this is not the
 * first time we see a platform having issues with mixed clear/encrypted data. This
 * heuristic might replace this work-around in the future.
 *
 * @param {MediaKeys} mediaKeys - The mediaKeys on which the initialization might
 * be performed.
 * @param {MediaKeySystemAccess} mediaKeySystemAccess - The MediaKeySystemAccess
 * through which this `MediaKeys` was created.
 * @returns {Promise} Resolve when done. Should never reject.
 */
export default async function forceMediaKeysInstantiationIfNeeded(
  mediaKeys: IMediaKeys,
  mediaKeySystemAccess: IMediaKeySystemAccess,
): Promise<void> {
  if (
    EnvDetector.browser === EnvDetector.BROWSERS.EdgeChromium &&
    EnvDetector.device === EnvDetector.DEVICES.Windows10Or11 &&
    mediaKeySystemAccess.keySystem.toLowerCase().indexOf("playready") >= 0
  ) {
    log.info("DRM", "Calling PlayReady MediaKeys initialization work-around");

    // NOTE:(Paul B.): I chose to rely on a `generateRequest`-based solution
    // instead of the potentially less risky `setServerCertificate`-based
    // solution for the following reasons:
    //   1. The application might want to set an actual server certificate.
    //      Doing multiple `setServerCertificate` calls on a single `MediaKeys`
    //      has unclear behaviors on devices, so this would need synchronization
    //      to know if we need to even need to perform this work-around.
    //   2. Under our "regular" path, we might set a server certificate *after*
    //      calling `setMediaKeys`, Microsoft told us that at least for this
    //      work-around it has to be done and finish *before* MediaKeys attachment.
    //      The combination of (1) and (2) makes it awkward to combine without
    //      risk of breaking other devices.
    //   3. The `generateRequest`-linked limitations observed in the past, were
    //      only encountered on a list of embedded devices (some STB,
    //      PlayStations) and we checked for windows 10/11 here.
    //   4. This is only one dummy session we're automatically closing. A trick
    //      that we're already doing sometimes when checking for keysystem
    //      support anyway so we know it's generally OK.
    try {
      let session: IMediaKeySession;
      const config = mediaKeySystemAccess.getConfiguration();
      if (
        Array.isArray(config.sessionTypes) &&
        !arrayIncludes(config.sessionTypes, "temporary") &&
        arrayIncludes(config.sessionTypes, "persistent-license")
      ) {
        // We don't have "temporary" (the default) support, but we do explicitly have
        // `"persistent-license"`. Use that one.
        session = mediaKeys.createSession("persistent-license");
      } else {
        session = mediaKeys.createSession();
      }
      const dummyInitData = getDummyInitDataForKeySystem(mediaKeySystemAccess.keySystem);
      await session.generateRequest("cenc", dummyInitData);
      session.close().catch(() => {
        log.warn("DRM", "Failed to close the dummy initialization session");
      });
    } catch (error) {
      log.info(
        "DRM",
        "PlayReady MediaKeys initialization work-around rejected",
        error instanceof Error ? error : "Unknown error",
      );
    }
  }
}
