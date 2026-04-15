import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
import DummyMediaElement from "../../../dist/es2017/experimental/tools/DummyMediaElement";
import { streamEventsAudioCodecSwitchInfos } from "../../contents/static/DASH_static_SegmentTimeline";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

const MID_PERIOD_RELOAD_EVENT = {
  id: "6",
  start: 45,
  end: 60,
};

describe("DASH Stream events on reload", function () {
  const oldMediaSourceSupported = MediaSource.isTypeSupported;
  let player;
  let dummy;

  beforeEach(() => {
    MediaSource.isTypeSupported = () => true;
    dummy = new DummyMediaElement();
    player = new RxPlayer({ videoElement: dummy });
    player.setWantedBufferAhead(10);
  });

  afterEach(() => {
    MediaSource.isTypeSupported = oldMediaSourceSupported;
    player.dispose();
  });

  async function loadContent(startAt) {
    player.loadVideo({
      url: streamEventsAudioCodecSwitchInfos.url,
      transport: streamEventsAudioCodecSwitchInfos.transport,
      autoPlay: true,
      startAt: { position: startAt },
      onCodecSwitch: "reload",
    });
    await waitForLoadedStateAfterLoadVideo(player);
  }

  async function waitForReloadAndPosition(
    observedStates,
    minimumPosition,
    maxTimeMs = 20000,
  ) {
    await checkAfterSleepWithBackoff({ minTimeMs: 1000, stepMs: 100, maxTimeMs }, () => {
      expect(player.getError()).toBe(null);
      expect(observedStates).toContain("PLAYING");
      expect(observedStates).toContain("RELOADING");
      expect(player.getPosition()).toBeGreaterThan(minimumPosition);
    });
  }

  it("should not send twice an event that stays active through an internal reload", async function () {
    const { crossingEvent } = streamEventsAudioCodecSwitchInfos;
    const receivedStreamEvents = [];
    const observedStates = [];
    player.addEventListener("streamEvent", (evt) => {
      if (evt.data.value.element.getAttribute("id") === crossingEvent.id) {
        receivedStreamEvents.push(evt);
      }
    });
    player.addEventListener("playerStateChange", (state) => {
      observedStates.push(state);
    });

    await loadContent(crossingEvent.start - 0.5);
    await waitForReloadAndPosition(observedStates, crossingEvent.period2Start + 1);

    expect(receivedStreamEvents).toHaveLength(1);
  }, 30000);

  it("should not emit a skip event for an event that stays active through an internal reload", async function () {
    const { crossingEvent } = streamEventsAudioCodecSwitchInfos;
    const receivedStreamEventSkips = [];
    const observedStates = [];
    player.addEventListener("streamEventSkip", (evt) => {
      if (evt.data.value.element.getAttribute("id") === crossingEvent.id) {
        receivedStreamEventSkips.push(evt);
      }
    });
    player.addEventListener("playerStateChange", (state) => {
      observedStates.push(state);
    });

    await loadContent(crossingEvent.start - 0.5);
    await waitForReloadAndPosition(observedStates, crossingEvent.period2Start + 1);

    expect(receivedStreamEventSkips).toHaveLength(0);
  }, 30000);

  it("should still emit later Period 2 events after the internal reload", async function () {
    const { crossingEvent, laterPeriodEvent } = streamEventsAudioCodecSwitchInfos;
    const receivedStreamEvents = [];
    const observedStates = [];
    player.addEventListener("streamEvent", (evt) => {
      if (evt.data.value.element.getAttribute("id") === laterPeriodEvent.id) {
        receivedStreamEvents.push(evt);
      }
    });
    player.addEventListener("playerStateChange", (state) => {
      observedStates.push(state);
    });

    await loadContent(crossingEvent.start - 0.5);
    await waitForReloadAndPosition(observedStates, laterPeriodEvent.start + 1, 30000);

    expect(receivedStreamEvents).toHaveLength(1);
  }, 40000);

  it("should not send twice an event that stays active through a mid-Period representation reload", async function () {
    const receivedStreamEvents = [];
    const observedStates = [];
    let initialRepresentationId;
    let targetRepresentationId;
    player.addEventListener("streamEvent", (evt) => {
      if (evt.data.value.element.getAttribute("id") === MID_PERIOD_RELOAD_EVENT.id) {
        receivedStreamEvents.push(evt);
      }
    });
    player.addEventListener("playerStateChange", (state) => {
      observedStates.push(state);
    });
    player.addEventListener("newAvailablePeriods", (periods) => {
      const period = periods[0];
      const videoTrack = player.getVideoTrack(period.id);
      expect(videoTrack).not.toBe(null);
      expect(videoTrack.representations.length).toBeGreaterThan(1);
      initialRepresentationId = videoTrack.representations[0].id;
      targetRepresentationId = videoTrack.representations[1].id;
      player.lockVideoRepresentations({
        periodId: period.id,
        representations: [initialRepresentationId],
      });
    });

    player.loadVideo({
      url: streamEventsAudioCodecSwitchInfos.url,
      transport: streamEventsAudioCodecSwitchInfos.transport,
      autoPlay: true,
      startAt: { position: MID_PERIOD_RELOAD_EVENT.start - 0.5 },
    });
    await waitForLoadedStateAfterLoadVideo(player);

    const initialPeriod = player.getCurrentPeriod();
    await checkAfterSleepWithBackoff(
      { minTimeMs: 100, stepMs: 100, maxTimeMs: 10000 },
      () => {
        expect(player.getError()).toBe(null);
        expect(receivedStreamEvents).toHaveLength(1);
        expect(observedStates).not.toContain("RELOADING");
        expect(observedStates).toContain("LOADING");
        expect(observedStates).toContain("PLAYING");
        expect(player.getPosition()).toBeGreaterThan(46);
        expect(initialRepresentationId).toBeDefined();
        expect(targetRepresentationId).toBeDefined();
      },
    );

    expect(player.getVideoRepresentation().id).toEqual(initialRepresentationId);
    player.lockVideoRepresentations({
      representations: [targetRepresentationId],
      switchingMode: "reload",
    });

    await checkAfterSleepWithBackoff(
      { minTimeMs: 200, stepMs: 100, maxTimeMs: 15000 },
      () => {
        expect(player.getError()).toBe(null);
        const reloadIndex = observedStates.indexOf("RELOADING");
        const lastPlayingIndex = observedStates.lastIndexOf("PLAYING");
        expect(reloadIndex).toBeGreaterThanOrEqual(0);
        expect(lastPlayingIndex).toBeGreaterThan(reloadIndex);
        expect(player.getPlayerState()).toBe("PLAYING");
        expect(player.getCurrentPeriod()?.id).toBe(initialPeriod?.id);
        expect(player.getPosition()).toBeGreaterThanOrEqual(
          MID_PERIOD_RELOAD_EVENT.start,
        );
        expect(player.getPosition()).toBeLessThan(MID_PERIOD_RELOAD_EVENT.end);
        expect(player.getVideoRepresentation().id).toEqual(targetRepresentationId);
      },
    );

    expect(receivedStreamEvents).toHaveLength(1);
  }, 30000);
});
