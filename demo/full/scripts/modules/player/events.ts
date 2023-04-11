import type { IBifThumbnail, IPlayerModuleState } from ".";
import type RxPlayer from "../../../../../src";
import type { IPlayerError } from "../../../../../src/public_types";
import type { IStateUpdater } from "../../lib/declareModule";

const POSITION_UPDATES_INTERVAL = 100;
const BUFFERED_DATA_UPDATES_INTERVAL = 100;

/**
 * Add event listeners to the RxPlayer to update the module's state at the right
 * time.
 * Unsubscribe when $destroy emit.
 * @param {RxPlayer} player
 * @param {Object} state
 * @param {AbortSignal} abortSignal
 */
function linkPlayerEventsToState(
  player: RxPlayer,
  state: IStateUpdater<IPlayerModuleState>,
  abortSignal: AbortSignal
): void {

  linkPlayerEventToState("textTrackChange", "subtitle");
  linkPlayerEventToState("audioTrackChange", "language");
  linkPlayerEventToState("videoTrackChange", "videoTrack");
  linkPlayerEventToState("videoBitrateChange", "videoBitrate");
  linkPlayerEventToState("audioBitrateChange", "audioBitrate");
  linkPlayerEventToState("error", "error");
  linkPlayerEventToState("volumeChange", "volume");
  linkPlayerEventToState("availableAudioTracksChange", "availableLanguages");
  linkPlayerEventToState("availableVideoTracksChange", "availableVideoTracks");
  linkPlayerEventToState("availableTextTracksChange", "availableSubtitles");
  linkPlayerEventToState("availableAudioBitratesChange", "availableAudioBitrates");
  linkPlayerEventToState("availableVideoBitratesChange", "availableVideoBitrates");

  player.addEventListener("imageTrackUpdate", onImageTrackUpdate);
  abortSignal.addEventListener("abort", () => {
    player.removeEventListener("imageTrackUpdate", onImageTrackUpdate);
  });
  function onImageTrackUpdate({ data }: { data: IBifThumbnail[] }) {
    state.update("images", data);
  }

  let positionUpdatesInterval: number | null = null;

  function startPositionUpdates() {
    stopPositionUpdates();

    // use an interval for current position
    positionUpdatesInterval = window.setInterval(
      updatePositionInfo,
      POSITION_UPDATES_INTERVAL);

    updatePositionInfo();

    function updatePositionInfo() {
      const position = player.getPosition();
      const duration = player.getVideoDuration();
      const videoTrack = player.getVideoTrack();
      const maximumPosition = player.getMaximumPosition();
      state.updateBulk({
        currentTime: player.getPosition(),
        wallClockDiff: player.getWallClockTime() - position,
        bufferGap: player.getVideoBufferGap(),
        duration: Number.isNaN(duration) ? undefined : duration,
        minimumPosition: player.getMinimumPosition(),
        maximumPosition: player.getMaximumPosition(),
        liveGap: typeof maximumPosition === "number" ?
          maximumPosition - player.getPosition() :
          undefined,
        playbackRate: player.getPlaybackRate(),
        videoTrackHasTrickMode: videoTrack !== null &&
          videoTrack !== undefined &&
          videoTrack.trickModeTracks !== undefined &&
          videoTrack.trickModeTracks.length > 0,
      });
    }
  }

  function stopPositionUpdates() {
    if (positionUpdatesInterval === null) {
      return;
    }
    clearInterval(positionUpdatesInterval);
    positionUpdatesInterval = null;
  }
  abortSignal.addEventListener("abort", stopPositionUpdates);

  player.addEventListener("playerStateChange", onStateUpdate);
  abortSignal.addEventListener("abort", () => {
    player.removeEventListener("playerStateChange", onStateUpdate);
  });

  function updateBufferedData(): void {
    if (player.getPlayerState() === "STOPPED") {
      return;
    }
    let audioContent = player.__priv_getSegmentBufferContent("audio");
    if (Array.isArray(audioContent)) {
      audioContent = audioContent.slice();
    }
    let textContent = player.__priv_getSegmentBufferContent("text");
    if (Array.isArray(textContent)) {
      textContent = textContent.slice();
    }
    let videoContent = player.__priv_getSegmentBufferContent("video");
    if (Array.isArray(videoContent)) {
      videoContent = videoContent.slice();
    }
    state.update("bufferedData", {
      audio: audioContent,
      video: videoContent,
      text: textContent,
    });
  }

  const bufferedDataItv = setInterval(
    updateBufferedData,
    BUFFERED_DATA_UPDATES_INTERVAL
  );
  updateBufferedData();
  abortSignal.addEventListener("abort", () => {
    clearInterval(bufferedDataItv);
  });

  player.addEventListener("warning", onWarning);
  abortSignal.addEventListener("abort", () => {
    player.removeEventListener("warning", onWarning);
  });

  function onWarning(warning: IPlayerError | Error) {
    if ("code" in warning) {
      switch (warning.code) {
        case "MEDIA_ERR_NOT_LOADED_METADATA":
          state.update("cannotLoadMetadata", true);
          break;
        case "MEDIA_ERR_BLOCKED_AUTOPLAY":
          state.update("autoPlayBlocked", true);
          break;
      }
    }
  }

  function linkPlayerEventToState<K extends keyof IPlayerModuleState>(
    event: Parameters<typeof player.addEventListener>[0],
    stateItem: K
  ): void {
    player.addEventListener(event, onEvent);
    function onEvent(payload: unknown): void {
      state.update(stateItem, payload as IPlayerModuleState[K]);
    }
    abortSignal.addEventListener("abort", () => {
      player.removeEventListener(event, onEvent);
    });
  }

  function onStateUpdate(playerState: string): void {
    const stateUpdates: Partial<IPlayerModuleState> = {
      cannotLoadMetadata: false,
      hasEnded: playerState === "ENDED",
      hasCurrentContent: !["STOPPED", "LOADING"].includes(playerState),
      isContentLoaded: !["STOPPED", "LOADING", "RELOADING"].includes(playerState),
      isBuffering: playerState === "BUFFERING",
      isLoading: playerState === "LOADING",
      isReloading: playerState === "RELOADING",
      isSeeking: playerState === "SEEKING",
      isStopped: playerState === "STOPPED",
    };

    switch (playerState) {
      case "ENDED":
        stateUpdates.autoPlayBlocked = false;
        stateUpdates.isPaused = true;
        break;
      case "PAUSED":
        stateUpdates.isPaused = true;
        break;
      case "PLAYING":
        stateUpdates.autoPlayBlocked = false;
        stateUpdates.isPaused = false;
        break;
      case "LOADED":
        startPositionUpdates();
        stateUpdates.isPaused = true;
        stateUpdates.isLive = player.isLive();
        break;
      case "STOPPED":
        stopPositionUpdates();
        stateUpdates.audioBitrate = undefined;
        stateUpdates.autoPlayBlocked = false;
        stateUpdates.videoBitrate = undefined;
        stateUpdates.availableAudioBitrates = [];
        stateUpdates.availableVideoBitrates = [];
        stateUpdates.availableVideoTracks = [];
        stateUpdates.availableLanguages = [];
        stateUpdates.availableSubtitles = [];
        stateUpdates.lowLatencyMode = false;
        stateUpdates.images = [];
        stateUpdates.subtitle = null;
        stateUpdates.language = null;
        stateUpdates.videoTrack = null;
        stateUpdates.currentTime = undefined;
        stateUpdates.wallClockDiff = undefined;
        stateUpdates.bufferGap = 0;
        stateUpdates.bufferedData = null;
        stateUpdates.duration = undefined;
        stateUpdates.minimumPosition = undefined;
        stateUpdates.maximumPosition = undefined;
        break;
    }

    if (playerState !== "STOPPED") {
      // error is never cleaned up
      stateUpdates.error = null;
    }

    state.updateBulk(stateUpdates);
  }
}

export {
  linkPlayerEventsToState,
};
