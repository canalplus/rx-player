import { expect } from "chai";
import RxPlayer from "../../../src";
import { manifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep.js";
import XHRLocker from "../../utils/xhr_locker.js";

/**
 * Test ability to add an external text track when loading a video.
 */

describe("external text track", function () {
  let player;
  let xhrLocker;

  beforeEach(() => {
    player = new RxPlayer();
    xhrLocker = XHRLocker();
  });

  afterEach(() => {
    player.dispose();
    xhrLocker.restore;
  });

  it("should be able to add an external text track", async function () {
    xhrLocker.lock();

    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      supplementaryTextTracks: {
        url: "http://fakeURL",
        language: "en",
        closedCaption: false,
        mimeType: "text/vtt",
      },
    });

    await sleep(1);
    await xhrLocker.flush();
    await sleep(1);

    const textTracks = player.getAvailableTextTracks();
    expect(textTracks.length).to.equal(1);
    expect(textTracks[0].language).to.equal("en");
    expect(textTracks[0].normalized).to.equal("eng");
    expect(textTracks[0].closedCaption).to.equal(false);
    expect(typeof textTracks[0].id).to.equal("string");
    expect(textTracks[0].id).to.not.equal("");
    expect(textTracks[0].active).to.equal(false);
  });

  it("should be able to add a closed caption text track", async function () {
    xhrLocker.lock();

    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      supplementaryTextTracks: {
        url: "http://fakeURL",
        language: "arm",
        closedCaption: true,
        mimeType: "text/vtt",
      },
    });

    await sleep(1);
    await xhrLocker.flush();
    await sleep(1);

    const textTracks = player.getAvailableTextTracks();
    expect(textTracks.length).to.equal(1);
    expect(textTracks[0].language).to.equal("arm");
    expect(textTracks[0].normalized).to.equal("hye");
    expect(textTracks[0].closedCaption).to.equal(true);
    expect(typeof textTracks[0].id).to.equal("string");
    expect(textTracks[0].id).to.not.equal("");
    expect(textTracks[0].active).to.equal(false);

  });

  it("should be able to add multiple external text tracks", async function () {
    xhrLocker.lock();

    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      supplementaryTextTracks: [
        {
          url: "http://fakeURL1",
          language: "en",
          closedCaption: false,
          mimeType: "text/vtt",
        },
        {
          url: "http://fakeURL2",
          language: "fr",
          closedCaption: false,
          mimeType: "text/vtt",
        },
        {
          url: "http://fakeURL3",
          language: "ger",
          closedCaption: true,
          mimeType: "text/vtt",
        },
      ],
    });

    await sleep(1);
    await xhrLocker.flush();
    await sleep(1);

    const textTracks = player.getAvailableTextTracks();
    expect(textTracks.length).to.equal(3);

    expect(textTracks[0].language).to.equal("en");
    expect(textTracks[0].normalized).to.equal("eng");
    expect(textTracks[0].closedCaption).to.equal(false);
    expect(typeof textTracks[0].id).to.equal("string");
    expect(textTracks[0].id).to.not.equal("");
    expect(textTracks[0].active).to.equal(false);

    expect(textTracks[1].language).to.equal("fr");
    expect(textTracks[1].normalized).to.equal("fra");
    expect(textTracks[1].closedCaption).to.equal(false);
    expect(typeof textTracks[1].id).to.equal("string");
    expect(textTracks[1].id).to.not.equal("");
    expect(textTracks[1].active).to.equal(false);

    expect(textTracks[2].language).to.equal("ger");
    expect(textTracks[2].normalized).to.equal("deu");
    expect(textTracks[2].closedCaption).to.equal(true);
    expect(typeof textTracks[2].id).to.equal("string");
    expect(textTracks[2].id).to.not.equal("");
    expect(textTracks[2].active).to.equal(false);
  });

  it("should switch initially to external text track if set as default language", async function () {
    xhrLocker.lock();

    const waysOfWritingDefaultTextTrack = [
      "en",
      "eng",
      { language: "en" },
      { language: "eng" },
      { language: "en", closedCaption: false },
      { language: "eng", closedCaption: false },
    ];

    for (const defaultTextTrack of waysOfWritingDefaultTextTrack) {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        supplementaryTextTracks: {
          url: "http://fakeURL",
          language: "en",
          closedCaption: false,
          mimeType: "text/vtt",
        },
        defaultTextTrack,
      });

      await sleep(1);
      await xhrLocker.flush();
      await sleep(1);

      const textTracks1 = player.getAvailableTextTracks();
      expect(textTracks1[0].active).to.equal(true);

      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        supplementaryTextTracks: [
          {
            url: "http://fakeURL1",
            language: "en",
            closedCaption: false,
            mimeType: "text/vtt",
          },
          {
            url: "http://fakeURL2",
            language: "fr",
            closedCaption: false,
            mimeType: "text/vtt",
          },
          {
            url: "http://fakeURL3",
            language: "ger",
            closedCaption: true,
            mimeType: "text/vtt",
          },
        ],
        defaultTextTrack,
      });

      await sleep(1);
      await xhrLocker.flush();
      await sleep(1);

      const textTracks2 = player.getAvailableTextTracks();
      expect(textTracks2[0].active).to.equal(true);
    }
  });

  it("should switch initially to a closed caption external text track if set as default language", async function () {
    xhrLocker.lock();

    const waysOfWritingDefaultTextTrack = [
      { language: "en", closedCaption: true },
      { language: "eng", closedCaption: true },
    ];

    for (const defaultTextTrack of waysOfWritingDefaultTextTrack) {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        supplementaryTextTracks: {
          url: "http://fakeURL",
          language: "en",
          closedCaption: true,
          mimeType: "text/vtt",
        },
        defaultTextTrack,
      });

      await sleep(1);
      await xhrLocker.flush();
      await sleep(1);

      const textTracks1 = player.getAvailableTextTracks();
      expect(textTracks1[0].active).to.equal(true);

      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        supplementaryTextTracks: [
          {
            url: "http://fakeURL1",
            language: "en",
            closedCaption: true,
            mimeType: "text/vtt",
          },
          {
            url: "http://fakeURL2",
            language: "fr",
            closedCaption: false,
            mimeType: "text/vtt",
          },
          {
            url: "http://fakeURL3",
            language: "ger",
            closedCaption: true,
            mimeType: "text/vtt",
          },
        ],
        defaultTextTrack,
      });


      await sleep(1);
      await xhrLocker.flush();
      await sleep(1);

      const textTracks2 = player.getAvailableTextTracks();
      expect(textTracks2[0].active).to.equal(true);
    }
  });

  it("should not switch initially to external text track if not set as default language", async function () {
    xhrLocker.lock();

    const waysOfWritingDefaultTextTrack = [
      "fr",
      undefined,
      null,
      { language: "english" },
      { language: "en", closedCaption: true },
      { language: "eng", closedCaption: true },
    ];

    for (const defaultTextTrack of waysOfWritingDefaultTextTrack) {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        supplementaryTextTracks: {
          url: "http://fakeURL",
          language: "en",
          closedCaption: false,
          mimeType: "text/vtt",
        },
        defaultTextTrack,
      });

      await sleep(1);
      await xhrLocker.flush();
      await sleep(1);

      const textTracks1 = player.getAvailableTextTracks();
      expect(textTracks1[0].active).to.equal(false);

      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        supplementaryTextTracks: [
          {
            url: "http://fakeURL1",
            language: "en",
            closedCaption: false,
            mimeType: "text/vtt",
          },
          {
            url: "http://fakeURL2",
            language: "fr",
            closedCaption: false,
            mimeType: "text/vtt",
          },
          {
            url: "http://fakeURL3",
            language: "ger",
            closedCaption: true,
            mimeType: "text/vtt",
          },
        ],
        defaultTextTrack,
      });

      await sleep(1);
      await xhrLocker.flush();
      await sleep(1);

      const textTracks2 = player.getAvailableTextTracks();
      expect(textTracks2[0].active).to.equal(false);
    }
  });
});
