import log from "../../../log";
import type ContentDecryptor from "../../../main_thread/decrypt";
import type { IManifestMetadata } from "../../../manifest";
import { getAdaptations } from "../../../manifest";
import type { IMediaElementPlaybackObserver } from "../../../playback_observer";
import areArraysOfNumbersEqual from "../../../utils/are_arrays_of_numbers_equal";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";

/**
 * Logic performed when the `ContentDecryptor` tells us that there are too
 * many DRM sessions created for the current content.
 *
 * We here try to determine which keys aren't needed anymore on the current
 * content, and indicate to the `ContentDecryptor` that it can "free" them.
 *
 * @param {Object} contentDecryptor - The `ContentDecryptor` instance which
 * has encountered the issue.
 * @param {Object} manifest - Metadata on the content currently being played.
 * @param {Object} playbackObserver - The PlaybackObserver linked to the same
 * media element than the one handled by the `ContentDecryptor`.
 * @param {Object} payload - The payload from the `tooMuchSessions` event from
 * the `ContentDecryptor`.
 */
export default function handleTooMuchMediaKeySessions(
  contentDecryptor: ContentDecryptor,
  manifest: IManifestMetadata,
  playbackObserver: IMediaElementPlaybackObserver,
  payload: {
    waitingKeyIds: Uint8Array[];
    activeKeyIds: Uint8Array[];
  },
): void {
  if (isNullOrUndefined(manifest)) {
    log.error("Init: Received tooMuchSessions error before fetching the Manifest");
    return;
  }

  // We will here free all keys that aren't needed for the content buffered
  // forward.

  const basePosition = Math.min(
    playbackObserver.getCurrentTime(),
    playbackObserver.getReference().getValue().position.getWanted(),
  );

  const keyIdsToCheck = payload.activeKeyIds.slice();
  for (const period of manifest.periods) {
    if (period.end !== undefined && period.end < basePosition) {
      continue;
    }
    for (const adaptation of getAdaptations(period)) {
      for (const representation of adaptation.representations) {
        const repKeyIds = representation.contentProtections?.keyIds;
        if (repKeyIds === undefined) {
          break;
        }
        for (let i = keyIdsToCheck.length - 1; i >= 0; i--) {
          const kidToCheck = keyIdsToCheck[i];
          for (const repKid of repKeyIds) {
            if (areArraysOfNumbersEqual(kidToCheck, repKid)) {
              keyIdsToCheck.splice(i, 1);
            }
          }
        }
      }
    }
  }

  if (keyIdsToCheck.length === 0) {
    // FIXME:
    log.error("Init: Too much MediaKeySession but found none to free");
  } else {
    const hasFreedSession = contentDecryptor.freeKeyIds(keyIdsToCheck);
    if (!hasFreedSession) {
      // FIXME:
      log.error("Init: Too much MediaKeySession even after freeing some keys");
    }
  }
}
