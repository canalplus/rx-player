import { expect } from "chai";
import RxPlayer from "../../../src";
import {
  manifestInfos,
} from "../../contents/DASH_static_SegmentTemplate_Multi_Periods";
import {
  multiPeriodDifferentChoicesInfos,
  multiPeriodSameChoicesInfos,
} from "../../contents/DASH_static_SegmentTimeline";
import launchTestsForContent from "../utils/launch_tests_for_content.js";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState.js";
import sleep from "../../utils/sleep.js";

describe("DASH non-linear multi-periods content (SegmentTemplate)", function () {
  launchTestsForContent(manifestInfos);
});

describe("DASH multi-Period with different choices", function () {
  let player;

  async function loadContent() {
    player.loadVideo({ url: multiPeriodDifferentChoicesInfos.url,
                       transport: multiPeriodDifferentChoicesInfos.transport });
    await waitForLoadedStateAfterLoadVideo(player);
  }

  async function goToFirstPeriod() {
    player.seekTo(5);
    await sleep(500);
    if (player.getPlayerState() !== "PAUSED") {
      await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
    }
    expect(player.getPosition()).to.be.within(0, 10);
  }

  async function goToSecondPeriod() {
    player.seekTo(120);
    await sleep(500);
    if (player.getPlayerState() !== "PAUSED") {
      await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
    }
    expect(player.getPosition()).to.be.within(118, 122);
  }

  beforeEach(() => {
    player = new RxPlayer();
    player.setWantedBufferAhead(5); // We don't really care
  });

  afterEach(() => {
    player.dispose();
  });

  it("should send the right events when seeking into a new Period", async function () {
    const availableAudioTracksChange = [];
    const availableVideoTracksChange = [];
    const videoTrackChangeEvents = [];
    const audioTrackChangeEvents = [];
    const periodChangeEvents = [];

    player.addEventListener("availableAudioTracksChange", (payload) => {
      availableAudioTracksChange.push(payload);
    });
    player.addEventListener("availableVideoTracksChange", (payload) => {
      availableVideoTracksChange.push(payload);
    });
    player.addEventListener("audioTrackChange", (payload) => {
      audioTrackChangeEvents.push(payload);
    });
    player.addEventListener("videoTrackChange", (payload) => {
      videoTrackChangeEvents.push(payload);
    });
    player.addEventListener("periodChange", (payload) => {
      periodChangeEvents.push(payload);
    });

    player.setMinAudioBitrate(Infinity);
    player.setMinVideoBitrate(Infinity);


    await loadContent();

    expect(availableAudioTracksChange).to.have.length(1);
    expect(availableAudioTracksChange[0]).to.have.length(3);

    expect(availableVideoTracksChange).to.have.length(1);
    expect(availableVideoTracksChange[0]).to.have.length(2);

    expect(audioTrackChangeEvents).to.have.length(1);
    expect(audioTrackChangeEvents[0].id).to.equal("audio-de-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(1);
    expect(videoTrackChangeEvents[0].id).to.equal("video-video-video/mp4");

    expect(periodChangeEvents).to.have.length(1);


    await goToSecondPeriod();

    expect(availableAudioTracksChange).to.have.length(2);
    expect(availableAudioTracksChange[1]).to.have.length(5);

    expect(availableVideoTracksChange).to.have.length(2);
    expect(availableVideoTracksChange[1]).to.have.length(2);

    expect(audioTrackChangeEvents).to.have.length(2);
    expect(audioTrackChangeEvents[1].id).to.equal("audio-fr-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(2);
    expect(videoTrackChangeEvents[1].id).to.equal("video-si-video-video/mp4");

    expect(periodChangeEvents).to.have.length(2);


    await goToFirstPeriod();

    expect(availableAudioTracksChange).to.have.length(3);
    expect(availableAudioTracksChange[2]).to.have.length(3);

    expect(availableVideoTracksChange).to.have.length(3);
    expect(availableVideoTracksChange[2]).to.have.length(2);

    expect(audioTrackChangeEvents).to.have.length(3);
    expect(audioTrackChangeEvents[2].id).to.equal("audio-de-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(3);
    expect(videoTrackChangeEvents[2].id).to.equal("video-video-video/mp4");

    expect(periodChangeEvents).to.have.length(3);
  });

  it("should send the right events when playing into a new Period", async function () {
    this.timeout(7000);
    const availableAudioTracksChange = [];
    const availableVideoTracksChange = [];
    const videoTrackChangeEvents = [];
    const audioTrackChangeEvents = [];
    const periodChangeEvents = [];

    player.addEventListener("availableAudioTracksChange", (payload) => {
      availableAudioTracksChange.push(payload);
    });
    player.addEventListener("availableVideoTracksChange", (payload) => {
      availableVideoTracksChange.push(payload);
    });
    player.addEventListener("audioTrackChange", (payload) => {
      audioTrackChangeEvents.push(payload);
    });
    player.addEventListener("videoTrackChange", (payload) => {
      videoTrackChangeEvents.push(payload);
    });
    player.addEventListener("periodChange", (payload) => {
      periodChangeEvents.push(payload);
    });

    player.setPlaybackRate(3);
    player.setMinAudioBitrate(Infinity);
    player.setMinVideoBitrate(Infinity);


    await loadContent();

    expect(availableAudioTracksChange).to.have.length(1);
    expect(availableAudioTracksChange[0]).to.have.length(3);

    expect(availableVideoTracksChange).to.have.length(1);
    expect(availableVideoTracksChange[0]).to.have.length(2);

    expect(audioTrackChangeEvents).to.have.length(1);
    expect(audioTrackChangeEvents[0].id).to.equal("audio-de-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(1);
    expect(videoTrackChangeEvents[0].id).to.equal("video-video-video/mp4");

    expect(periodChangeEvents).to.have.length(1);


    // still first Period
    player.play();
    player.seekTo(100);
    await sleep(100);
    if (player.getPlayerState() !== "PLAYING") {
      await waitForPlayerState(player, "PLAYING", ["SEEKING", "BUFFERING"]);
    }
    expect(player.getPosition()).to.be.within(100, 101);

    expect(availableAudioTracksChange).to.have.length(1);
    expect(availableVideoTracksChange).to.have.length(1);
    expect(audioTrackChangeEvents).to.have.length(1);
    expect(videoTrackChangeEvents).to.have.length(1);
    expect(periodChangeEvents).to.have.length(1);

    await sleep(4000);
    expect(player.getPosition()).to.be.at.least(102);

    expect(availableAudioTracksChange).to.have.length(2);
    expect(availableAudioTracksChange[1]).to.have.length(5);

    expect(availableVideoTracksChange).to.have.length(2);
    expect(availableVideoTracksChange[1]).to.have.length(2);

    expect(audioTrackChangeEvents).to.have.length(2);
    expect(audioTrackChangeEvents[1].id).to.equal("audio-fr-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(2);
    expect(videoTrackChangeEvents[1].id).to.equal("video-si-video-video/mp4");

    expect(periodChangeEvents).to.have.length(2);
  });
});

describe("DASH multi-Period with same choices", function () {
  let player;

  async function loadContent() {
    player.loadVideo({ url: multiPeriodSameChoicesInfos.url,
                       transport: multiPeriodSameChoicesInfos.transport });
    await waitForLoadedStateAfterLoadVideo(player);
  }

  async function goToFirstPeriod() {
    player.seekTo(5);
    await sleep(500);
    if (player.getPlayerState() !== "PAUSED") {
      await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
    }
    expect(player.getPosition()).to.be.within(0, 10);
  }

  async function goToSecondPeriod() {
    player.seekTo(120);
    await sleep(500);
    if (player.getPlayerState() !== "PAUSED") {
      await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
    }
    expect(player.getPosition()).to.be.within(118, 122);
  }

  beforeEach(() => {
    player = new RxPlayer();
    player.setWantedBufferAhead(5); // We don't really care
  });

  afterEach(() => {
    player.dispose();
  });

  it("should send the right events when seeking into a new Period", async function () {
    const availableAudioTracksChange = [];
    const availableVideoTracksChange = [];
    const videoTrackChangeEvents = [];
    const audioTrackChangeEvents = [];
    const periodChangeEvents = [];

    player.addEventListener("availableAudioTracksChange", (payload) => {
      availableAudioTracksChange.push(payload);
    });
    player.addEventListener("availableVideoTracksChange", (payload) => {
      availableVideoTracksChange.push(payload);
    });
    player.addEventListener("audioTrackChange", (payload) => {
      audioTrackChangeEvents.push(payload);
    });
    player.addEventListener("videoTrackChange", (payload) => {
      videoTrackChangeEvents.push(payload);
    });
    player.addEventListener("periodChange", (payload) => {
      periodChangeEvents.push(payload);
    });

    player.setMinAudioBitrate(Infinity);
    player.setMinVideoBitrate(Infinity);


    await loadContent();

    expect(availableAudioTracksChange).to.have.length(1);
    expect(availableAudioTracksChange[0]).to.have.length(8);

    expect(availableVideoTracksChange).to.have.length(1);
    expect(availableVideoTracksChange[0]).to.have.length(4);

    expect(audioTrackChangeEvents).to.have.length(1);
    expect(audioTrackChangeEvents[0].id).to.equal("audio-de-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(1);
    expect(videoTrackChangeEvents[0].id).to.equal("video-video-video/mp4-dup");

    expect(periodChangeEvents).to.have.length(1);


    await goToSecondPeriod();

    expect(availableAudioTracksChange).to.have.length(2);
    expect(availableAudioTracksChange[1]).to.have.length(8);

    expect(availableVideoTracksChange).to.have.length(2);
    expect(availableVideoTracksChange[1]).to.have.length(4);

    expect(audioTrackChangeEvents).to.have.length(2);
    expect(audioTrackChangeEvents[1].id).to.equal("audio-de-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(2);
    expect(videoTrackChangeEvents[1].id).to.equal("video-video-video/mp4-dup");

    expect(periodChangeEvents).to.have.length(2);


    await goToFirstPeriod();

    expect(availableAudioTracksChange).to.have.length(3);
    expect(availableAudioTracksChange[2]).to.have.length(8);

    expect(availableVideoTracksChange).to.have.length(3);
    expect(availableVideoTracksChange[2]).to.have.length(4);

    expect(audioTrackChangeEvents).to.have.length(3);
    expect(audioTrackChangeEvents[2].id).to.equal("audio-de-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(3);
    expect(videoTrackChangeEvents[2].id).to.equal("video-video-video/mp4-dup");

    expect(periodChangeEvents).to.have.length(3);
  });

  it("should send the right events when playing into a new Period", async function () {
    this.timeout(7000);
    const availableAudioTracksChange = [];
    const availableVideoTracksChange = [];
    const videoTrackChangeEvents = [];
    const audioTrackChangeEvents = [];
    const periodChangeEvents = [];

    player.addEventListener("availableAudioTracksChange", (payload) => {
      availableAudioTracksChange.push(payload);
    });
    player.addEventListener("availableVideoTracksChange", (payload) => {
      availableVideoTracksChange.push(payload);
    });
    player.addEventListener("audioTrackChange", (payload) => {
      audioTrackChangeEvents.push(payload);
    });
    player.addEventListener("videoTrackChange", (payload) => {
      videoTrackChangeEvents.push(payload);
    });
    player.addEventListener("periodChange", (payload) => {
      periodChangeEvents.push(payload);
    });

    player.setPlaybackRate(3);
    player.setMinAudioBitrate(Infinity);
    player.setMinVideoBitrate(Infinity);


    await loadContent();

    expect(availableAudioTracksChange).to.have.length(1);
    expect(availableAudioTracksChange[0]).to.have.length(8);

    expect(availableVideoTracksChange).to.have.length(1);
    expect(availableVideoTracksChange[0]).to.have.length(4);

    expect(audioTrackChangeEvents).to.have.length(1);
    expect(audioTrackChangeEvents[0].id).to.equal("audio-de-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(1);
    expect(videoTrackChangeEvents[0].id).to.equal("video-video-video/mp4-dup");

    expect(periodChangeEvents).to.have.length(1);


    // still first Period
    player.play();
    player.seekTo(100);
    await sleep(100);
    if (player.getPlayerState() !== "PLAYING") {
      await waitForPlayerState(player, "PLAYING", ["SEEKING", "BUFFERING"]);
    }
    expect(player.getPosition()).to.be.within(100, 101);

    expect(availableAudioTracksChange).to.have.length(1);
    expect(availableVideoTracksChange).to.have.length(1);
    expect(audioTrackChangeEvents).to.have.length(1);
    expect(videoTrackChangeEvents).to.have.length(1);
    await sleep(4000);
    expect(player.getPosition()).to.be.at.least(102);

    expect(availableAudioTracksChange).to.have.length(2);
    expect(availableAudioTracksChange[1]).to.have.length(8);

    expect(availableVideoTracksChange).to.have.length(2);
    expect(availableVideoTracksChange[1]).to.have.length(4);

    expect(audioTrackChangeEvents).to.have.length(2);
    expect(audioTrackChangeEvents[1].id).to.equal("audio-de-audio-mp4a.40.2-audio/mp4");

    expect(videoTrackChangeEvents).to.have.length(2);
    expect(videoTrackChangeEvents[1].id).to.equal("video-video-video/mp4-dup");
    expect(periodChangeEvents).to.have.length(2);
  });
});
