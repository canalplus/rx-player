import { expect } from "chai";
import RxPlayer from "../../../src";
import {
  multiAdaptationSetsInfos,
} from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep.js";
import XHRMock from "../../utils/request_mock";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";

describe("DASH multi-track content (SegmentTimeline)", function () {
  let player;
  let xhrMock;

  beforeEach(() => {
    player = new RxPlayer();
    player.setWantedBufferAhead(5); // We don't really care
    xhrMock = new XHRMock();
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
  });

  async function loadContent() {
    player.loadVideo({ url: multiAdaptationSetsInfos.url,
                       transport: multiAdaptationSetsInfos.transport });
    await waitForLoadedStateAfterLoadVideo(player);
  }

  async function goToSecondPeriod() {
    player.seekTo(120);
    await sleep(500);
    if (player.getPlayerState() !== "PAUSED") {
      await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
    }
    expect(player.getPosition()).to.be.within(118, 122);
  }

  async function goToFirstPeriod() {
    player.seekTo(5);
    await sleep(500);
    if (player.getPlayerState() !== "PAUSED") {
      await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
    }
    expect(player.getPosition()).to.be.within(0, 10);
  }

  function setAudioTrack(language, isAudioDescription) {
    const audioTracks = player.getAvailableAudioTracks();
    for (let i = 0; i < audioTracks.length; i++) {
      const audioTrack = audioTracks[i];
      if (audioTrack.language === language &&
          audioTrack.audioDescription === isAudioDescription)
      {
        player.setAudioTrack(audioTrack.id);
        return;
      }
    }
    throw new Error("Audio track not found.");
  }

  function setTextTrack(language, isClosedCaption) {
    const textTracks = player.getAvailableTextTracks();
    for (let i = 0; i < textTracks.length; i++) {
      const textTrack = textTracks[i];
      if (textTrack.language === language &&
          textTrack.closedCaption === isClosedCaption)
      {
        player.setTextTrack(textTrack.id);
        return;
      }
    }
    throw new Error("Text track not found.");
  }

  function setVideoTrack(codecRules, isSignInterpreted) {
    const videoTracks = player.getAvailableVideoTracks();
    for (let i = 0; i < videoTracks.length; i++) {
      const videoTrack = videoTracks[i];
      if (videoTrack.signInterpreted === isSignInterpreted) {
        const { representations } = videoTrack;
        if (codecRules === null) {
          player.setVideoTrack(videoTrack.id);
          return;
        } else if (codecRules.all) {
          if (representations.every(r => codecRules.test.test(r.codec))) {
            player.setVideoTrack(videoTrack.id);
            return;
          }
        } else if (representations.some(r => codecRules.test.test(r.codec))) {
          player.setVideoTrack(videoTrack.id);
          return;
        }
      }
    }
    throw new Error("Video track not found.");
  }

  function checkAudioTrack(language, normalizedLanguage, isAudioDescription) {
    const currentAudioTrack = player.getAudioTrack();
    expect(currentAudioTrack).to.not.equal(null);
    expect(currentAudioTrack.language).to.equal(language);
    expect(currentAudioTrack.normalized).to.equal(normalizedLanguage);
    expect(currentAudioTrack.audioDescription).to.equal(isAudioDescription);
  }

  function checkNoTextTrack() {
    const currentTextTrack = player.getTextTrack();
    expect(currentTextTrack).to.equal(null);
  }

  function checkTextTrack(language, normalizedLanguage, isClosedCaption) {
    const currentTextTrack = player.getTextTrack();
    expect(currentTextTrack).to.not.equal(null);
    expect(currentTextTrack.language).to.equal(language);
    expect(currentTextTrack.normalized).to.equal(normalizedLanguage);
    expect(currentTextTrack.closedCaption).to.equal(isClosedCaption);
  }

  function checkNoVideoTrack() {
    const currentVideoTrack = player.getVideoTrack();
    expect(currentVideoTrack).to.equal(null);
  }

  function checkVideoTrack(codecRules, isSignInterpreted) {
    const currentVideoTrack = player.getVideoTrack();

    if (isSignInterpreted === undefined) {
      expect(Object.prototype.hasOwnProperty.call(currentVideoTrack,
                                                  "signInterpreted"))
        .to.equal(false);
    } else {
      expect(currentVideoTrack.signInterpreted).to.equal(isSignInterpreted);
    }

    if (codecRules !== null) {
      const representations = currentVideoTrack.representations;
      expect(representations.length).to.not.equal(0);
      const { all, test } = codecRules;
      if (all) {
        expect(representations.every(r => test.test(r.codec))).to.equal(true);
      } else {
        expect(representations.some(r => test.test(r.codec))).to.equal(true);
      }
    }
  }

  function chooseWantedAudioTrack(availableAudioTracks, preference) {
    const wantedAudioDescription = preference.audioDescription === true;
    for (const availableAudioTrack of availableAudioTracks) {
      if (availableAudioTrack.language === preference.language &&
          availableAudioTrack.audioDescription === wantedAudioDescription)
      {
        return availableAudioTrack;
      }
    }
  }

  function chooseWantedTextTrack(availableTextTracks, preference) {
    const wantedClosedCaption = preference.closedCaption === true;
    for (const availableTextTrack of availableTextTracks) {
      if (availableTextTrack.language === preference.language &&
          availableTextTrack.closedCaption === wantedClosedCaption)
      {
        return availableTextTrack;
      }
    }
  }

  function chooseWantedVideoTrack(availableVideoTracks, preference) {
    const codecRules = preference.codec === undefined ?
      null :
      preference.codec;
    const wantedSignInterpreted = preference.signInterpreted === true;
    for (const availableVideoTrack of availableVideoTracks) {
      if (codecRules !== null) {
        const representations = availableVideoTrack.representations;
        expect(representations.length).to.not.equal(0);
        const { all, test } = codecRules;
        if (all) {
          if (!representations.every(r => test.test(r.codec))) {
            continue;
          }
        } else {
          if (!representations.some(r => test.test(r.codec))) {
            continue;
          }
        }
      }
      if (availableVideoTrack.signInterpreted === wantedSignInterpreted) {
        return availableVideoTrack;
      }
    }
  }

  function updateTracks(
    periods,
    audioTrackPreferences,
    textTrackPreferences,
    videoTrackPreferences
  ) {
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];

      const audioTrackPreference = audioTrackPreferences[i];
      const textTrackPreference = textTrackPreferences[i];
      const videoTrackPreference = videoTrackPreferences[i];

      if (audioTrackPreference !== undefined) {
        const availableAudioTracks = player
          .getAvailableAudioTracks(period.id);
        expect(availableAudioTracks).not.to.be.empty;
        const wantedAudioTrack = chooseWantedAudioTrack(availableAudioTracks,
                                                        audioTrackPreference);
        if (wantedAudioTrack !== undefined) {
          player.setAudioTrack({ trackId: wantedAudioTrack.id,
                                 periodId: period.id });
          expect(player.getAudioTrack(period.id).id)
            .to.equal(wantedAudioTrack.id);
        }
      }

      if (textTrackPreference !== undefined) {
        if (textTrackPreference === null) {
          player.disableTextTrack(period.id);
          expect(player.getTextTrack(period.id)).to.equal(null);
        } else {
          const availableTextTracks = player
            .getAvailableTextTracks(period.id);
          expect(availableTextTracks).not.to.be.empty;
          const wantedTextTrack = chooseWantedTextTrack(availableTextTracks,
                                                        textTrackPreference);
          if (wantedTextTrack !== undefined) {
            player.setTextTrack({ trackId: wantedTextTrack.id,
                                  periodId: period.id });
            expect(player.getTextTrack(period.id).id)
              .to.equal(wantedTextTrack.id);
          }
        }
      }

      if (videoTrackPreference !== undefined) {
        if (videoTrackPreference === null) {
          player.disableVideoTrack(period.id);
          expect(player.getVideoTrack(period.id)).to.equal(null);
        } else {
          const availableVideoTracks = player
            .getAvailableVideoTracks(period.id);
          expect(availableVideoTracks).not.to.be.empty;
          const wantedVideoTrack = chooseWantedVideoTrack(availableVideoTracks,
                                                          videoTrackPreference);
          if (wantedVideoTrack !== undefined) {
            player.setVideoTrack({ trackId: wantedVideoTrack.id,
                                   periodId: period.id });
            expect(player.getVideoTrack(period.id).id)
              .to.equal(wantedVideoTrack.id);
          }
        }
      }
    }
  }

  it("should properly load the content with the right default tracks", async function () {
    this.timeout(3000);
    xhrMock.lock();
    player.loadVideo({ url: multiAdaptationSetsInfos.url,
                       transport: multiAdaptationSetsInfos.transport });

    await sleep(10);

    expect(xhrMock.getLockedXHR().length).to.equal(1); // Manifest request
    await xhrMock.flush();
    await sleep(10);

    expect(player.getPlayerState()).to.equal("LOADING");
    await xhrMock.unlock();
    await sleep(1500);

    expect(player.getPlayerState()).to.equal("LOADED");

    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);

    await goToSecondPeriod();
    checkAudioTrack("fr", "fra", true);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.42C014/ }, undefined);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);
  });

  it("should allow setting every tracks before loading segments", async function () {
    player = new RxPlayer();

    let called = 0;
    let manifestRequestDone = false;
    let afterManifestResponse = false;
    player.addEventListener("newAvailablePeriods", (periods) => {
      called++;
      expect(manifestRequestDone).to.equal(true);
      expect(afterManifestResponse).to.equal(false);
      expect(xhrMock.getLockedXHR()).to.have.lengthOf(0);
      updateTracks(
        periods,
        [
          { language: "fr", audioDescription: false },
          { language: "de", audioDescription: true },
        ],
        [
          { language: "de", closedCaption: false },
          { language: "fr", closedCaption: true },
        ],
        [
          { codec: { all: true, test: /avc1\.42C014/ }, signInterpreted: true },
          { codec: { all: false, test: /avc1\.640028/ } },
        ]
      );
    });
    xhrMock.lock();
    player.loadVideo({ url: multiAdaptationSetsInfos.url,
                       transport: multiAdaptationSetsInfos.transport });

    await sleep(10);

    expect(xhrMock.getLockedXHR().length).to.equal(1); // Manifest request
    manifestRequestDone = true;
    await xhrMock.flush();
    afterManifestResponse = true;
    await sleep(10);

    expect(called).to.equal(1);
    checkAudioTrack("fr", "fra", false);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);
    xhrMock.unlock();

    await waitForLoadedStateAfterLoadVideo(player);
    expect(called).to.equal(1);

    checkAudioTrack("fr", "fra", false);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);

    await goToSecondPeriod();
    expect(called).to.equal(1);
    checkAudioTrack("de", "deu", true);
    checkTextTrack("fr", "fra", true);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);
  });

  it("should allow the initial disabling of the video tracks", async () => {
    player = new RxPlayer();
    player.addEventListener("newAvailablePeriods", (periods) => {
      updateTracks(periods, [], [], [ null, null ]);
    });
    await loadContent();
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkNoVideoTrack();

    await goToSecondPeriod();
    checkAudioTrack("fr", "fra", true);
    checkNoTextTrack();
    checkNoVideoTrack();
  });

  it("setting the current track should not be persisted between Periods", async () => {
    await loadContent();
    await sleep(300);

    // TODO AUDIO codec
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);

    setAudioTrack("fr", true);
    setTextTrack("de", false);
    setVideoTrack({ all: false, test: /avc1\.640028/ }, true);

    await sleep(300);
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, true);

    await goToSecondPeriod();
    checkAudioTrack("fr", "fra", true);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.42C014/ }, undefined);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);
  });

  it("setting a track should be persisted when seeking back to that Period", async () => {
    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);

    setAudioTrack("fr", true);
    setTextTrack("de", false);
    setVideoTrack({ all: true, test: /avc1\.42C014/ }, undefined);

    await sleep(50);
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.42C014/ }, undefined);

    await goToSecondPeriod();
    await goToFirstPeriod();
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.42C014/ }, undefined);
  });
});
