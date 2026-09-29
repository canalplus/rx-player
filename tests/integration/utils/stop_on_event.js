import { describe, afterEach, beforeEach, it, expect } from "vitest";
import RxPlayer from "../../../dist/es2017";
import { MULTI_THREAD } from "../../../dist/es2017/features/list/index.js";
import {
  EMBEDDED_WORKER,
  EMBEDDED_DASH_WASM,
} from "../../../dist/es2017/__GENERATED_CODE/index.js";
import { lockLowestBitrates } from "../../utils/bitrates";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";

const RxPlayerEvents = [
  "playerStateChange",
  "newAvailablePeriods",
  "error",
  "warning",
  "seeking",
  "seeked",
  "positionUpdate",
  "periodChange",
  "brokenRepresentationsLock",
  "play",
  "pause",
  "inbandEvents",
  "streamEvent",
  "streamEventSkip",
  "trackUpdate",
  "representationListUpdate",
  "audioRepresentationChange",
  "audioTrackChange",
  "availableAudioTracksChange",
  "textTrackChange",
  "availableTextTracksChange",
  "videoRepresentationChange",
  "videoTrackChange",
  "availableVideoTracksChange",
];

function listenToAllEvents(player, cb) {
  RxPlayerEvents.forEach((evtName) => {
    player.addEventListener(evtName, (payload) => cb(evtName, payload));
  });
}

function checkStoppedState(player) {
  expect(player.getPlayerState()).toEqual("STOPPED");
  expect(player.getPosition()).toEqual(0);
  expect(player.getWallClockTime()).toEqual(0);
  expect(player.getWallClockOffset()).toEqual(0);
  expect(player.getMinimumPosition()).toEqual(null);
  expect(player.getMaximumPosition()).toEqual(null);
  expect(player.getLivePosition()).toEqual(null);
  const duration = player.getMediaDuration();
  expect(Number.isNaN(duration)).toEqual(true);
  expect(player.getError()).toEqual(null);
  expect(player.getAvailablePeriods()).toEqual([]);
  expect(player.getCurrentPeriod()).toEqual(null);
  expect(player.getAudioTrack()).toEqual(undefined);
  expect(player.getTextTrack()).toEqual(undefined);
  expect(player.getVideoTrack()).toEqual(undefined);
  expect(player.getAvailableAudioTracks()).toEqual([]);
  expect(player.getAvailableTextTracks()).toEqual([]);
  expect(player.getAvailableVideoTracks()).toEqual([]);
  expect(player.getAudioRepresentation()).toEqual(undefined);
  expect(player.getVideoRepresentation()).toEqual(undefined);
  expect(player.getLockedAudioRepresentations()).toEqual(null);
  expect(player.getLockedVideoRepresentations()).toEqual(null);
  expect(player.isLive()).toEqual(false);
  expect(player.getCurrentBufferGap()).toEqual(0);
  expect(player.getContentUrls()).toEqual(undefined);
  expect(player.isBuffering()).toEqual(false);
  expect(player.isPaused()).toEqual(true);
  expect(player.isContentLoaded()).toEqual(false);
  expect(player.getCurrentModeInformation()).toEqual(null);
  expect(player.getAvailableThumbnailTracks()).toEqual([]);
}

/**
 * Tests for event handling, especially when destructive operations
 * are performed during event callbacks
 * @param {Object} manifestInfos - information about what should be found in the Manifest.
 */
export default function launchEventInterruptionTests(
  manifestInfos,
  { multithread } = {},
) {
  let player;

  if (multithread === true) {
    RxPlayer.addFeatures([MULTI_THREAD]);
  }

  const { transport } = manifestInfos;

  /**
   * Base test function for stopping the content on specific events.
   * @param {Object} config - Test configuration
   * @param {string} config.eventName - The event name to trigger stop on
   * @param {Function} config.shouldTrigger - Function to determine if stop
   * should be triggered, receive the event's payload as argument.
   * @param {boolean} config.autoPlay - Whether to autoplay the video
   * @param {Array.<string>|null|undefined} [config.expectedStateChanges] -
   * If set: expected state changes.
   * @param {Object|null} [config.loadVideoOptions] - Optional additional
   * loadVideo options
   */
  async function testStopDuringEvent({
    eventName,
    shouldTrigger,
    autoPlay = false,
    expectedStateChanges = null,
    loadVideoOptions = {},
  }) {
    let shouldNowBeStopped = false;
    let hasStoppedProperly = false;
    const stateChanges = [];
    const eventContext = {}; // For storing event-specific state (e.g., counters)

    listenToAllEvents(player, (evtName, payload) => {
      if (shouldNowBeStopped) {
        if (evtName === "playerStateChange" && payload === "STOPPED") {
          stateChanges.push(payload);
          return; // Normal stopped event
        }
        // We shouldn't receive events after stopping
        hasStoppedProperly = false;
        /* eslint-disable-next-line no-console */
        console.error("Failing test: unexpected event", evtName, payload);
        throw new Error("Received unexpected event: " + evtName);
      }

      if (evtName === "playerStateChange") {
        stateChanges.push(payload);
      }

      if (evtName === eventName && shouldTrigger(payload, eventContext)) {
        shouldNowBeStopped = true;
        player.stop();
        checkStoppedState(player);
        hasStoppedProperly = true;
      }
    });

    lockLowestBitrates(player);

    player.loadVideo({
      url: manifestInfos.url,
      transport,
      autoPlay,
      ...loadVideoOptions,
    });

    await checkAfterSleepWithBackoff({ minTimeMs: 200, maxTimeMs: 15000 }, () => {
      expect(shouldNowBeStopped).to.equal(true);
    });
    expect(hasStoppedProperly).to.equal(true);

    if (Array.isArray(expectedStateChanges)) {
      expect(stateChanges).toEqual(expectedStateChanges);
    }
  }

  async function waitForPlaybackProgress(player, minPositionMs = 500) {
    await checkAfterSleepWithBackoff({ minTimeMs: 200, maxTimeMs: 5000 }, () => {
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(player.getPosition() * 700).to.be.greaterThan(minPositionMs);
    });
  }

  function switchToAlternateTrack(player, trackType) {
    const getTracksMethod = `getAvailable${trackType}Tracks`;
    const setTrackMethod = `set${trackType}Track`;
    const disableTrackMethod = `disable${trackType}Track`;
    const getCurrentTrackMethod = `get${trackType}Track`;

    const tracks = player[getTracksMethod]();
    if (tracks.length > 1) {
      const currentTrack = player[getCurrentTrackMethod]();
      const alternateTrack = tracks.find((t) => t.id !== currentTrack?.id);
      player[setTrackMethod](alternateTrack.id);
    } else {
      player[disableTrackMethod]();
    }
  }

  describe("Event Interruption Tests" + (multithread ? " (multithread)" : ""), () => {
    beforeEach(() => {
      player = new RxPlayer();
      if (multithread === true) {
        player.attachWorker({
          workerUrl: EMBEDDED_WORKER,
          dashWasmUrl: EMBEDDED_DASH_WASM,
        });
      }
    });

    afterEach(() => {
      player.dispose();
    });

    describe("stop() during initial loading events", { timeout: 20000 }, () => {
      it("should stop immediately when stop() is called during playerStateChange to LOADING", async () => {
        await testStopDuringEvent({
          eventName: "playerStateChange",
          shouldTrigger: (payload) => payload === "LOADING",
          autoPlay: false,
          expectedStateChanges: ["LOADING", "STOPPED"],
        });
      });

      it("should stop immediately when stop() is called during playerStateChange to LOADED", async () => {
        await testStopDuringEvent({
          eventName: "playerStateChange",
          shouldTrigger: (payload) => payload === "LOADED",
          autoPlay: false,
          expectedStateChanges: ["LOADING", "LOADED", "STOPPED"],
        });
      });

      it("should stop immediately when stop() is called during playerStateChange to PLAYING", async () => {
        await testStopDuringEvent({
          eventName: "playerStateChange",
          shouldTrigger: (payload) => payload === "PLAYING",
          autoPlay: true,
          expectedStateChanges: ["LOADING", "LOADED", "PLAYING", "STOPPED"],
        });
      });
    });

    describe("stop() during playback events", { timeout: 25000 }, () => {
      it("should stop immediately when stop() is called during positionUpdate", async () => {
        await testStopDuringEvent({
          eventName: "positionUpdate",
          shouldTrigger: (_payload, ctx) => {
            ctx.count = (ctx.count || 0) + 1;
            return ctx.count === 2;
          },
          autoPlay: true,
        });
      });

      it("should stop immediately when stop() is called on a seeking event", async () => {
        await Promise.all([
          testStopDuringEvent({
            eventName: "seeking",
            shouldTrigger: () => true,
            autoPlay: true,
          }),
          waitForPlaybackProgress(player, 700).then(() => {
            player.seekTo({ position: player.getPosition() + 5 });
          }),
        ]);
      });

      it("should stop immediately when stop() is called on a seeked event", async () => {
        await Promise.all([
          testStopDuringEvent({
            eventName: "seeked",
            shouldTrigger: () => true,
            autoPlay: true,
          }),
          waitForPlaybackProgress(player, 700).then(() => {
            player.seekTo({ position: player.getPosition() + 5 });
          }),
        ]);
      });
    });

    // TODO: Only run this on Manifest with multiple audio/video/text tracks
    describe("stop() during track switch events", { timeout: 25000 }, () => {
      [
        { type: "Audio", eventName: "audioTrackChange" },
        { type: "Video", eventName: "videoTrackChange" },
        { type: "Text", eventName: "textTrackChange" },
      ].forEach(({ type, eventName }) => {
        it(`should stop immediately when stop() is called during ${type.toLowerCase()} track switch`, async () => {
          await Promise.all([
            testStopDuringEvent({
              eventName,
              shouldTrigger: (_payload, ctx) => {
                ctx.count = (ctx.count || 0) + 1;
                return ctx.count === 2; // Wait for actual track change, not initial
              },
              autoPlay: true,
            }),
            waitForPlaybackProgress(player, 700).then(() =>
              switchToAlternateTrack(player, type),
            ),
          ]);
        });
      });
    });

    describe("stop() during metadata events", { timeout: 20000 }, () => {
      [
        "newAvailablePeriods",
        "periodChange",
        "audioTrackChange",
        "textTrackChange",
        "videoTrackChange",
        "availableAudioTracksChange",
        "availableTextTracksChange",
        "availableVideoTracksChange",
        "videoRepresentationChange",
      ].forEach((evtName) => {
        it(`should stop immediately when stop() is called during ${evtName} event`, async () => {
          await testStopDuringEvent({
            eventName: evtName,
            shouldTrigger: () => true,
            autoPlay: false,
          });
        });
      });
    });
  });
}
