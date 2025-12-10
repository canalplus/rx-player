import { describe, beforeEach, afterEach, it, expect } from "vitest";
import {
  manifestInfos,
  manifestAudioOnlyInfos,
  manifestVideoNotSupportedInfos,
} from "../../contents/DASH_dynamic_SegmentTemplate_UnsupportedAudio";
import RxPlayer from "../../../dist/es2017";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff";
import waitForState from "../../utils/waitForPlayerState";
import sleep from "../../utils/sleep.js";

let player;

describe("Content with video or audio not supported", function () {
  beforeEach(() => {
    player = new RxPlayer();
  });

  afterEach(() => {
    player.dispose();
  });

  it("should trigger an error if the audio is not supported with onAudioTracksNotPlayable:'error'", async function () {
    player.setWantedBufferAhead(15);
    const { url, transport } = manifestInfos;
    let playerError;
    let noPlayableTrackEvent;
    player.addEventListener("error", (err) => {
      playerError = err;
    });
    player.addEventListener("noPlayableTrack", (event) => {
      noPlayableTrackEvent = event;
    });
    player.loadVideo({
      url,
      transport,
      autoPlay: true,
      onAudioTracksNotPlayable: "error",
    });
    await waitForState(player, "STOPPED", [
      "LOADING",
      "LOADED",
      "BUFFERING",
      "SEEKING",
      "RELOADING",
    ]);
    expect(noPlayableTrackEvent).toBe(undefined);
    expect(playerError).not.toBe(undefined);
    expect(playerError.message).toBe(
      "MANIFEST_INCOMPATIBLE_CODECS_ERROR: No supported audio adaptations",
    );
  });

  it("should trigger a noPlayableTrack event if the video is not supported with onVideoTracksNotPlayable:'continue'", async function () {
    player.setWantedBufferAhead(15);
    const { url, transport } = manifestVideoNotSupportedInfos;
    let playerError;
    let noPlayableTrackEvent;
    player.addEventListener("error", (err) => {
      playerError = err;
    });
    player.addEventListener("noPlayableTrack", (event) => {
      noPlayableTrackEvent = event;
    });
    player.loadVideo({
      url,
      transport,
      autoPlay: true,
      onVideoTracksNotPlayable: "continue",
    });
    await waitForState(player, "PLAYING", [
      "LOADING",
      "LOADED",
      "BUFFERING",
      "SEEKING",
      "RELOADING",
    ]);
    expect(noPlayableTrackEvent?.trackType).toBe("video");
    expect(playerError).toBe(undefined);
  });

  it("should trigger an error if the video is not supported with onVideoTracksNotPlayable:'error'", async function () {
    player.setWantedBufferAhead(15);
    const { url, transport } = manifestVideoNotSupportedInfos;
    let playerError;
    let noPlayableTrackEvent;
    player.addEventListener("error", (err) => {
      playerError = err;
    });
    player.addEventListener("noPlayableTrack", (event) => {
      noPlayableTrackEvent = event;
    });
    player.loadVideo({
      url,
      transport,
      autoPlay: true,
      onVideoTracksNotPlayable: "error",
    });
    await waitForState(player, "STOPPED", [
      "LOADING",
      "LOADED",
      "BUFFERING",
      "SEEKING",
      "RELOADING",
    ]);
    expect(noPlayableTrackEvent).toBe(undefined);
    expect(playerError).not.toBe(undefined);
    expect(playerError.message).toBe(
      "MANIFEST_INCOMPATIBLE_CODECS_ERROR: No supported video adaptations",
    );
  });

  it("should trigger a noPlayableTrack event if the audio is not supported with onAudioTracksNotPlayable:'continue'", async function () {
    player.setWantedBufferAhead(15);
    const { url, transport } = manifestInfos;
    let playerError;
    let noPlayableTrackEvent;
    player.addEventListener("error", (err) => {
      playerError = err;
    });
    player.addEventListener("noPlayableTrack", (event) => {
      noPlayableTrackEvent = event;
    });
    player.loadVideo({
      url,
      transport,
      autoPlay: true,
      onAudioTracksNotPlayable: "continue",
    });
    await waitForState(player, "PLAYING", [
      "LOADING",
      "LOADED",
      "BUFFERING",
      "SEEKING",
      "RELOADING",
    ]);
    expect(noPlayableTrackEvent?.trackType).toBe("audio");
    expect(playerError).toBe(undefined);
  });

  it("should trigger an error if the audio is not supported and the video is disabled", async function () {
    player.setWantedBufferAhead(15);
    const { url, transport } = manifestInfos;
    let playerError;
    let noPlayableTrackEvent;
    player.addEventListener("error", (err) => {
      playerError = err;
    });
    player.addEventListener("noPlayableTrack", (event) => {
      noPlayableTrackEvent = event;
    });
    player.loadVideo({
      url,
      transport,
      autoPlay: true,
      onAudioTracksNotPlayable: "continue",
    });
    await waitForState(player, "PLAYING", [
      "LOADING",
      "LOADED",
      "BUFFERING",
      "SEEKING",
      "RELOADING",
    ]);
    expect(noPlayableTrackEvent).not.toBe(undefined);
    expect(noPlayableTrackEvent.trackType).toBe("audio");

    const waitStopped = waitForState(player, "STOPPED", [
      "LOADING",
      "LOADED",
      "BUFFERING",
      "SEEKING",
      "RELOADING",
      "PLAYING",
    ]);
    player.disableVideoTrack();
    await waitStopped;
    expect(playerError).not.toBe(undefined);
    expect(playerError.message).toBe(
      "NO_AUDIO_VIDEO_TRACKS: No audio and no video tracks are set.",
    );
  });

  it("should trigger an error if the video is not supported and the audio is disabled", async function () {
    player.setWantedBufferAhead(15);
    const { url, transport } = manifestVideoNotSupportedInfos;
    let playerError;
    let noPlayableTrackEvent;
    player.addEventListener("error", (err) => {
      playerError = err;
    });
    player.addEventListener("noPlayableTrack", (event) => {
      noPlayableTrackEvent = event;
    });
    player.loadVideo({
      url,
      transport,
      autoPlay: true,
      onVideoTracksNotPlayable: "continue",
    });
    await waitForState(player, "PLAYING", [
      "LOADING",
      "LOADED",
      "BUFFERING",
      "SEEKING",
      "RELOADING",
    ]);
    expect(noPlayableTrackEvent).not.toBe(undefined);
    expect(noPlayableTrackEvent.trackType).toBe("video");

    const waitStopped = waitForState(player, "STOPPED", [
      "LOADING",
      "LOADED",
      "BUFFERING",
      "SEEKING",
      "RELOADING",
      "PLAYING",
    ]);
    player.disableAudioTrack();
    await waitStopped;
    expect(playerError).not.toBe(undefined);
    expect(playerError.message).toBe(
      "NO_AUDIO_VIDEO_TRACKS: No audio and no video tracks are set.",
    );
  });

  it("should trigger an error if audio only content is not supported", async function () {
    player.setWantedBufferAhead(15);
    const { url, transport } = manifestAudioOnlyInfos;
    let noPlayableTrackEvent;
    player.addEventListener("error", (err) => {
      playerError = err;
    });
    player.addEventListener("noPlayableTrack", (event) => {
      noPlayableTrackEvent = event;
    });
    player.loadVideo({
      url,
      transport,
      autoPlay: true,
      onAudioTracksNotPlayable: "continue",
    });
    let playerError;

    await checkAfterSleepWithBackoff({ maxTimeMs: 1500, stepMs: 100 }, () => {
      expect(playerError).not.toBe(undefined);
    });
    expect(playerError.message).toBe(
      "MANIFEST_INCOMPATIBLE_CODECS_ERROR: No supported audio adaptations",
    );
    expect(noPlayableTrackEvent).toBe(undefined);
  });

  it("should trigger an error if audio and video is not supported", async function () {
    player.setWantedBufferAhead(15);
    const { url, transport } = manifestAudioOnlyInfos;
    let noPlayableTrackEvent;

    player.addEventListener("error", (err) => {
      playerError = err;
    });
    player.addEventListener("noPlayableTrack", (event) => {
      noPlayableTrackEvent = event;
    });
    player.loadVideo({
      url,
      transport,
      autoPlay: true,
      onAudioTracksNotPlayable: "continue",
    });
    let playerError;

    await sleep(100);
    expect(noPlayableTrackEvent).toBe(undefined);
    expect(playerError).not.toBe(undefined);
    expect(playerError.message).toBe(
      "MANIFEST_INCOMPATIBLE_CODECS_ERROR: No supported audio adaptations",
    );
  });
});
