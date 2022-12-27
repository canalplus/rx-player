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

  it("should use the forced text track linked to the default audio track by default", async function () {
    player = new RxPlayer();

    await loadContent();
    checkAudioTrack("fr", "fra", false);
    checkTextTrack("fr", "fra", { closedCaption: false, forced: true });
  });

  it("should list the corresponding text tracks as \"forced\"", function () {
    return new Promise((resolve, reject) => {
      player = new RxPlayer();

      player.addEventListener("error", err => {
        reject(err);
      });
      player.addEventListener("newAvailablePeriods", (periods) => {
        try {
          expect(periods).to.have.length(1);
          const tracksPeriod1 = player.getAvailableTextTracks(periods[0].id);
          expect(tracksPeriod1).to.have.length(5);
          const forcedTracksPeriod1 = tracksPeriod1
            .filter(t => t.forced);
          expect(forcedTracksPeriod1).to.have.length(3);
          const forcedTracksLanguages = forcedTracksPeriod1
            .map(t => t.language);
          expect(forcedTracksLanguages).to.include("fr");
          expect(forcedTracksLanguages).to.include("de");
          expect(forcedTracksLanguages).to.include("");
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      loadContent();
    });
  });
});
