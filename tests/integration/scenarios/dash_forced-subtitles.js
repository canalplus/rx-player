import { expect } from "chai";
import RxPlayer from "../../../src";
import {
  forcedSubtitles,
} from "../../contents/DASH_static_SegmentTimeline";
import XHRMock from "../../utils/request_mock";
import {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";

describe("DASH forced-subtitles content (SegmentTimeline)", function () {
  let player;
  let xhrMock;

  async function loadContent() {
    player.loadVideo({ url: forcedSubtitles.url,
                       transport: forcedSubtitles.transport });
    await waitForLoadedStateAfterLoadVideo(player);
  }

  function checkNoTextTrack() {
    const currentTextTrack = player.getTextTrack();
    expect(currentTextTrack).to.equal(null);
  }

  function checkAudioTrack(language, normalizedLanguage, isAudioDescription) {
    const currentAudioTrack = player.getAudioTrack();
    expect(currentAudioTrack).to.not.equal(null);
    expect(currentAudioTrack.language).to.equal(language);
    expect(currentAudioTrack.normalized).to.equal(normalizedLanguage);
    expect(currentAudioTrack.audioDescription).to.equal(isAudioDescription);
  }

  function checkTextTrack(language, normalizedLanguage, props) {
    const currentTextTrack = player.getTextTrack();
    expect(currentTextTrack).to.not.equal(null);
    expect(currentTextTrack.language).to.equal(language);
    expect(currentTextTrack.normalized).to.equal(normalizedLanguage);
    expect(currentTextTrack.closedCaption).to.equal(
      props.closedCaption,
      `"closedCaption" not set to "${props.closedCaption}" but ` +
      `to "${currentTextTrack.closedCaption}"`);
    expect(currentTextTrack.forced).to.equal(
      props.forced,
      `"forced" not set to "${props.forced}" but ` +
      `to "${currentTextTrack.forced}"`);
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

  it("should set the forced text track associated to the current audio track", async function () {
    player.dispose();
    player = new RxPlayer({
      preferredAudioTracks: [{
        language: "fr",
        audioDescription: false,
      }],
    });

    await loadContent();
    checkAudioTrack("fr", "fra", false);
    checkTextTrack("fr", "fra", { closedCaption: false, forced: true });

    player.setPreferredAudioTracks([{ language: "de", audioDescription: false }]);
    await loadContent();
    checkAudioTrack("de", "deu", false);
    checkTextTrack("de", "deu", { closedCaption: false, forced: true });
  });

  it("should set the forced text track associated to no language if none is linked to the audio track", async function () {
    player.dispose();
    player = new RxPlayer({
      preferredAudioTracks: [{
        language: "en",
        audioDescription: false,
      }],
    });

    await loadContent();
    checkAudioTrack("en", "eng", false);
    checkTextTrack("", "", {
      closedCaption: false,
      forced: true,
    });
  });

  it("should still prefer preferences over forced subtitles", async function () {
    player.dispose();
    player = new RxPlayer({
      preferredAudioTracks: [{
        language: "fr",
        audioDescription: false,
      }],
      preferredTextTracks: [{
        language: "fr",
        closedCaption: false,
      }],
    });

    await loadContent();
    checkAudioTrack("fr", "fra", false);
    checkTextTrack("fr", "fra", { closedCaption: false, forced: undefined });

    player.setPreferredTextTracks([{ language: "fr", closedCaption: true }]);
    await loadContent();
    checkAudioTrack("fr", "fra", false);
    checkTextTrack("fr", "fra", { closedCaption: true, forced: undefined });

    player.setPreferredAudioTracks([{ language: "de", audioDescription: undefined }]);
    await loadContent();
    checkAudioTrack("de", "deu", false);
    checkTextTrack("fr", "fra", { closedCaption: true, forced: undefined });

    player.setPreferredTextTracks([null]);
    await loadContent();
    checkNoTextTrack();
  });

  it("should fallback to forced subtitles if no preference match", async function () {
    player.dispose();
    player = new RxPlayer({
      preferredAudioTracks: [{
        language: "fr",
        audioDescription: false,
      }],
      preferredTextTracks: [{
        language: "swa",
        closedCaption: false,
      }, {
        language: "de",
        closedCaption: true,
      }],
    });

    await loadContent();
    checkAudioTrack("fr", "fra", false);
    checkTextTrack("fr", "fra", { closedCaption: false, forced: true });
  });
});
