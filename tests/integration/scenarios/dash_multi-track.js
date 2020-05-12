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

  async function loadContent() {
    player.loadVideo({ url: multiAdaptationSetsInfos.url,
                       transport: multiAdaptationSetsInfos.transport });
    await waitForLoadedStateAfterLoadVideo(player);
  }

  async function goToSecondPeriod() {
    player.seekTo(120);
    await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
    expect(player.getPosition()).to.be.within(118, 122);
  }

  async function goToFirstPeriod() {
    player.seekTo(5);
    await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
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
    expect(currentVideoTrack).to.not.equal(null);

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

  beforeEach(() => {
    player = new RxPlayer();
    player.setWantedBufferAhead(5); // We don't really care
    xhrMock = new XHRMock();
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
  });

  it("should properly load the content with the right default tracks", async function () {
    xhrMock.lock();
    player.loadVideo({ url: multiAdaptationSetsInfos.url,
                       transport: multiAdaptationSetsInfos.transport });

    await sleep(10);

    expect(xhrMock.getLockedXHR().length).to.equal(1); // Manifest request
    await xhrMock.flush();
    await sleep(10);

    expect(player.getPlayerState()).to.equal("LOADING");
    await xhrMock.unlock();
    await sleep(500);

    expect(player.getPlayerState()).to.equal("LOADED");

    // TODO AUDIO codec
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);

    await goToSecondPeriod();
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);
  });

  it("should load the tracks corresponding to the most preferred content as set in the constructor", async function () {
    player.dispose();
    player = new RxPlayer({ preferredAudioTracks: [{ language: "fr",
                                                     audioDescription: false }],
                            preferredVideoTracks: [{ codec: { all: true,
                                                              test: /avc1\.42C014/},
                                                     signInterpreted: true }],
                            preferredTextTracks: [{ language: "fr",
                                                    closedCaption: false } ] });
    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("fr", "fra", false);
    checkTextTrack("fr", "fra", false);
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);

    await goToSecondPeriod();
    checkAudioTrack("fr", "fra", false);
    checkTextTrack("fr", "fra", false);
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);
  });

  it("should load the tracks corresponding to the most preferred content as set in the corresponding RxPlayer methods", async function () {
    player.setPreferredAudioTracks([ { language: "fr",
                                       audioDescription: true } ]);
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /avc1\.640028/},
                                       signInterpreted: true }]);
    player.setPreferredTextTracks([ { language: "de",
                                      closedCaption: true } ]);
    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", true);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, true);

    await goToSecondPeriod();
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", true);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, true);
  });

  it("should initially consider the last set preference between constructor and methods", async () => {
    player.dispose();
    player = new RxPlayer({ preferredAudioTracks: [{ language: "fr",
                                                     audioDescription: false }],
                            preferredVideoTracks: [{ codec: { all: true,
                                                              test: /avc1\.42C014/},
                                                     signInterpreted: false }],
                            preferredTextTracks: [{ language: "fr",
                                                    closedCaption: false } ] });
    player.setPreferredAudioTracks([ { language: "de",
                                       audioDescription: true } ]);
    player.setPreferredVideoTracks([ { codec: { all: true,
                                                test: /avc1\.42C014/},
                                       signInterpreted: undefined }]);
    player.setPreferredTextTracks([ { language: "de",
                                      closedCaption: true } ]);

    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("de", "deu", true);
    checkTextTrack("de", "deu", true);
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);

    await goToSecondPeriod();
    checkAudioTrack("de", "deu", true);
    checkTextTrack("de", "deu", true);
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);
  });

  it("should initially consider the last set preference between constructor and multiple methods", async () => {
    player.dispose();
    player = new RxPlayer({ preferredAudioTracks: [{ language: "fr",
                                                     audioDescription: false }],
                            preferredVideoTracks: [{ codec: { all: true,
                                                              test: /avc1\.42C014/},
                                                     signInterpreted: false }],
                            preferredTextTracks: [{ language: "fr",
                                                    closedCaption: false } ] });
    player.setPreferredAudioTracks([ { language: "de",
                                       audioDescription: true } ]);
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /avc1\.640028/},
                                       signInterpreted: true }]);
    player.setPreferredTextTracks([ { language: "de",
                                      closedCaption: true } ]);
    player.setPreferredAudioTracks([ { language: "fr",
                                       audioDescription: true } ]);
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /avc1\.640028/},
                                       signInterpreted: false }]);
    player.setPreferredTextTracks([ { language: "fr",
                                      closedCaption: true } ]);
    player.setPreferredAudioTracks([ { language: "deu",
                                       audioDescription: false } ]);
    player.setPreferredVideoTracks([ { codec: { all: true,
                                                test: /avc1\.42C014/},
                                       signInterpreted: true }]);
    player.setPreferredTextTracks([ { language: "de",
                                      closedCaption: false } ]);
    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("de", "deu", false);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);

    await goToSecondPeriod();
    checkAudioTrack("de", "deu", false);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: true, test: /avc1\.42C014/ }, true);
  });

  it("should set the nth supported preference if the first one is not found", async () => {
    player.setPreferredAudioTracks([ { language: "ita",
                                       audioDescription: false },
                                     { language: "en",
                                       audioDescription: false },
                                     { language: "deu",
                                       audioDescription: false },
                                     { language: "fr",
                                       audioDescription: false } ]);
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /foo/} },
                                     { codec: { all: false,
                                                test: /bar/ },
                                       signInterpreted: false },
                                     { codec: { all: true,
                                                test: /avc1\.42C014/ },
                                       signInterpreted: false },
                                     { codec: { all: false,
                                                test: /avc1\.640028/ },
                                       signInterpreted: undefined } ]);
    player.setPreferredTextTracks([ { language: "ita",
                                      closedCaption: false },
                                    { language: "en",
                                      closedCaption: false },
                                    { language: "deu",
                                      closedCaption: false },
                                    { language: "fr",
                                      closedCaption: false } ]);
    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("de", "deu", false);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);

    await goToSecondPeriod();
    checkAudioTrack("de", "deu", false);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);
  });

  it("should fallback to the default track if none is found", async () => {
    player.setPreferredAudioTracks([ { language: "ita",
                                       audioDescription: false },
                                     { language: "en",
                                       audioDescription: false } ]);
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /foo/} },
                                     { codec: { all: false,
                                                test: /bar/ },
                                       signInterpreted: false },
                                     { codec: { all: true,
                                                test: /avc1\.42C014/ },
                                       signInterpreted: false } ]);
    player.setPreferredTextTracks([ { language: "ita",
                                      closedCaption: false },
                                    { language: "en",
                                      closedCaption: false } ]);
    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);

    await goToSecondPeriod();
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);
  });

  it("should not update the current tracks for non-applied preferences", async () => {
    await loadContent();
    player.setPreferredAudioTracks([ { language: "fr",
                                       audioDescription: true } ]);
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /avc1\.640028/},
                                       signInterpreted: true }]);
    player.setPreferredTextTracks([ { language: "de",
                                      closedCaption: false } ]);
    await sleep(100);
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);

    await goToSecondPeriod();
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, true);
  });

  it("should disable the video track if the constructor preference says so", async () => {
    player.dispose();
    player = new RxPlayer({ preferredVideoTracks: [null] });
    await loadContent();
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkNoVideoTrack();

    await goToSecondPeriod();
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkNoVideoTrack();
  });

  it("should disable the video track if the constructor preference says so", async () => {
    player.setPreferredVideoTracks([null]);
    await loadContent();
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkNoVideoTrack();
  });

  it("should disable the video track when the corresponding setting is reached in the preferences", async () => {
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /foo/} },
                                     { codec: { all: false,
                                                test: /bar/ },
                                       signInterpreted: false },
                                     null,
                                     { codec: { all: false,
                                                test: /avc1\.640028/ },
                                       signInterpreted: undefined } ]);
    await loadContent();
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkNoVideoTrack();

    await goToSecondPeriod();
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkNoVideoTrack();
  });

  it("setting a track should not be persisted between Periods", async () => {
    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);

    setAudioTrack("fr", true);
    setTextTrack("de", false);
    setVideoTrack({ all: false, test: /avc1\.640028/ }, true);

    await sleep(50);
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, true);

    await goToSecondPeriod();
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);
  });

  it("setting a track should be persisted when seeking back to that Period", async () => {
    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("de", "deu", false);
    checkNoTextTrack();
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, undefined);

    setAudioTrack("fr", true);
    setTextTrack("de", false);
    setVideoTrack({ all: false, test: /avc1\.640028/ }, true);

    await sleep(50);
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, true);

    await goToSecondPeriod();
    await goToFirstPeriod();
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, true);
  });

  it("preferences should be persisted if already set for a given Period", async () => {
    this.timeout(5000);

    player.setPreferredAudioTracks([ { language: "fr",
                                       audioDescription: true } ]);
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /avc1\.640028/},
                                       signInterpreted: true }]);
    player.setPreferredTextTracks([ { language: "de",
                                      closedCaption: true } ]);
    await loadContent();

    // TODO AUDIO codec
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", true);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, true);

    player.setPreferredAudioTracks([ { language: "de",
                                       audioDescription: false } ]);
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /avc1\.42C014/},
                                       signInterpreted: true }]);
    player.setPreferredTextTracks([ { language: "de",
                                      closedCaption: false } ]);

    await goToSecondPeriod();
    checkAudioTrack("de", "deu", false);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.42C014/ }, true);

    await sleep(500);
    await goToFirstPeriod();
    checkAudioTrack("fr", "fra", true);
    checkTextTrack("de", "deu", true);
    checkVideoTrack({ all: false, test: /avc1\.640028/ }, true);

    player.setPreferredAudioTracks([ { language: "fr",
                                       audioDescription: true } ]);
    player.setPreferredVideoTracks([ { codec: { all: false,
                                                test: /avc1\.640028/},
                                       signInterpreted: true }]);
    player.setPreferredTextTracks([ { language: "de",
                                      closedCaption: true } ]);

    await sleep(500);
    await goToSecondPeriod();
    checkAudioTrack("de", "deu", false);
    checkTextTrack("de", "deu", false);
    checkVideoTrack({ all: false, test: /avc1\.42C014/ }, true);
  });
});
