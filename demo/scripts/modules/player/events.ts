import type { IPlayerModuleState } from ".";
import type RxPlayer from "rx-player/minimal";
import type {
  IBrokenRepresentationsLockContext,
  IPlayerError,
  IVideoTrack,
} from "rx-player/types";
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
  abortSignal: AbortSignal,
): void {
  linkPlayerEventToState("textTrackChange", "subtitle");
  linkPlayerEventToState("videoRepresentationChange", "videoRepresentation");
  linkPlayerEventToState("audioRepresentationChange", "audioRepresentation");
  linkPlayerEventToState("error", "error");
  linkPlayerEventToState("volumeChange", "volumeInfo");
  linkPlayerEventToState("audioTrackChange", "audioTrack");
  linkPlayerEventToState("videoTrackChange", "videoTrack");
  linkPlayerEventToState("availableAudioTracksChange", "availableAudioTracks");
  linkPlayerEventToState("availableVideoTracksChange", "availableVideoTracks");
  linkPlayerEventToState("availableTextTracksChange", "availableSubtitles");

  let positionUpdatesInterval: number | null = null;

  function startPositionUpdates() {
    stopPositionUpdates();

    // use an interval for current position
    positionUpdatesInterval = window.setInterval(
      updatePositionInfo,
      POSITION_UPDATES_INTERVAL,
    );

    updatePositionInfo();

    function updatePositionInfo() {
      const position = player.getPosition();
      const duration = player.getMediaDuration();
      const videoTrack = player.getVideoTrack();
      const livePosition = player.getLivePosition();
      const maximumPosition = player.getMaximumPosition();
      let bufferGap = player.getCurrentBufferGap();
      bufferGap = !isFinite(bufferGap) || isNaN(bufferGap) ? 0 : bufferGap;

      const livePos = livePosition ?? maximumPosition;
      state.updateBulk({
        currentTime: player.getPosition(),
        wallClockDiff: player.getWallClockTime() - position,
        bufferGap,
        duration: Number.isNaN(duration) ? undefined : duration,
        livePosition,
        minimumPosition: player.getMinimumPosition(),
        maximumPosition,
        liveGap: typeof livePos === "number" ? livePos - player.getPosition() : undefined,
        playbackRate: player.getPlaybackRate(),
        videoTrackHasTrickMode:
          videoTrack !== null &&
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

  async function updateBufferedData(): Promise<void> {
    if (player.getPlayerState() === "STOPPED") {
      return;
    }
    try {
      const metrics = await player.__priv_getSegmentSinkMetrics();
      let audioContent = metrics?.segmentSinks.audio.segmentInventory ?? null;
      if (Array.isArray(audioContent)) {
        audioContent = audioContent.slice();
      }
      let textContent = metrics?.segmentSinks.text.segmentInventory ?? null;
      if (Array.isArray(textContent)) {
        textContent = textContent.slice();
      }
      let videoContent = metrics?.segmentSinks.video.segmentInventory ?? null;
      if (Array.isArray(videoContent)) {
        videoContent = videoContent.slice();
      }
      state.update("bufferedData", {
        audio: audioContent,
        video: videoContent,
        text: textContent,
      });
    } catch (err) {
      // Do nothing
    }
  }

  const bufferedDataItv = setInterval(updateBufferedData, BUFFERED_DATA_UPDATES_INTERVAL);
  updateBufferedData().catch(() => {
    // do nothing
  });
  abortSignal.addEventListener("abort", () => {
    clearInterval(bufferedDataItv);
  });

  player.addEventListener("warning", onWarning);
  abortSignal.addEventListener("abort", () => {
    player.removeEventListener("warning", onWarning);
  });

  player.addEventListener("brokenRepresentationsLock", onBrokenRepresentationsLock);
  abortSignal.addEventListener("abort", () => {
    player.removeEventListener("brokenRepresentationsLock", onBrokenRepresentationsLock);
  });

  player.addEventListener("videoTrackChange", onVideoTrackChange);
  abortSignal.addEventListener("abort", () => {
    player.removeEventListener("videoTrackChange", onVideoTrackChange);
  });

  player.addEventListener("audioTrackChange", onAudioTrackChange);
  abortSignal.addEventListener("abort", () => {
    player.removeEventListener("audioTrackChange", onAudioTrackChange);
  });

  function onBrokenRepresentationsLock(evt: IBrokenRepresentationsLockContext): void {
    const currentPeriod = player.getCurrentPeriod();
    if (evt.period.id !== currentPeriod?.id) {
      return;
    }
    if (evt.trackType === "video") {
      state.update("videoRepresentationsLocked", false);
    } else if (evt.trackType === "audio") {
      state.update("audioRepresentationsLocked", false);
    }
  }

  function onVideoTrackChange(videoTrack: IVideoTrack | null): void {
    const videoRepresentationsLocked = player.getLockedVideoRepresentations() !== null;
    state.updateBulk({
      videoRepresentationsLocked,
      videoTrackHasTrickMode:
        videoTrack !== null &&
        videoTrack !== undefined &&
        videoTrack.trickModeTracks !== undefined &&
        videoTrack.trickModeTracks.length > 0,
    });
  }

  function onAudioTrackChange(): void {
    const audioRepresentationsLocked = player.getLockedAudioRepresentations() !== null;
    state.update("audioRepresentationsLocked", audioRepresentationsLocked);
  }

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
    stateItem: K,
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
      isBuffering: playerState === "BUFFERING" || playerState === "FREEZING",
      isLoading: playerState === "LOADING",
      isReloading: playerState === "RELOADING",
      isSeeking: playerState === "SEEKING",
      isStopped: playerState === "STOPPED",
    };

    switch (playerState) {
      case "LOADING":
        stateUpdates.useWorker = player.getCurrentModeInformation()?.useWorker === true;
        break;
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
        stateUpdates.audioRepresentation = undefined;
        stateUpdates.autoPlayBlocked = false;
        stateUpdates.videoRepresentation = undefined;
        stateUpdates.availableVideoTracks = [];
        stateUpdates.availableAudioTracks = [];
        stateUpdates.availableSubtitles = [];
        stateUpdates.lowLatencyMode = false;
        stateUpdates.subtitle = null;
        stateUpdates.audioTrack = null;
        stateUpdates.videoTrack = null;
        stateUpdates.currentTime = undefined;
        stateUpdates.wallClockDiff = undefined;
        stateUpdates.bufferGap = 0;
        stateUpdates.bufferedData = null;
        stateUpdates.duration = undefined;
        stateUpdates.minimumPosition = undefined;
        stateUpdates.maximumPosition = undefined;
        stateUpdates.livePosition = undefined;
        stateUpdates.useWorker = false;
        break;
    }

    if (playerState !== "STOPPED") {
      // error is never cleaned up
      stateUpdates.error = null;
    }

    state.updateBulk(stateUpdates);
  }
}

export { linkPlayerEventsToState };
