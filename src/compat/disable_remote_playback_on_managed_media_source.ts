import type { CancellationSignal } from "../utils/task_canceller.ts";
import BROWSER_GLOBALS, { type IMediaElement } from "./browser_compatibility_types.ts";

/**
 * Temporarily disables remote playback on a media element by setting the
 * `disableRemotePlayback` attribute to `true` when using a `ManagedMediaSource`.
 * The original value of the `disableRemotePlayback` attribute is restored when
 * the cancellation signal is triggered.
 *
 * This is useful when the `ManagedMediaSource` is being used and
 * the media element needs to ensure that remote playback (e.g., Airplay) is disabled
 * during the playback session.
 * @param {HTMLElement} mediaElement - The media element whose `disableRemotePlayback`
 * attribute will be modified.
 * @param {CancellationSignal} cancellationSignal - The signal that, when triggered,
 * restores the `disableRemotePlayback` attribute to its original value.
 */
export default function disableRemotePlaybackOnManagedMediaSource(
  mediaElement: IMediaElement,
  cancellationSignal: CancellationSignal,
) {
  if (BROWSER_GLOBALS.isManagedMediaSource && "disableRemotePlayback" in mediaElement) {
    const disableRemotePlaybackPreviousValue = mediaElement.disableRemotePlayback;
    cancellationSignal.register(() => {
      /**
       * Restore the `disableRemotePlayback` attribute to its previous value.
       * This ensures that the media element's state is the same as it was before
       * calling `RxPlayer.loadVideo` in the application.
       */
      mediaElement.disableRemotePlayback = disableRemotePlaybackPreviousValue;
    });
    /**
     * Using ManagedMediaSource needs to disableRemotePlayback or to provide
     * an Airplay source alternative, such as HLS.
     * https://github.com/w3c/media-source/issues/320
     */
    mediaElement.disableRemotePlayback = true;
  }
}
