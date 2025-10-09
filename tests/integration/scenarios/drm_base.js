import { describe, beforeEach, afterEach, it, expect } from "vitest";
import { manifestInfos } from "../../contents/DASH_DRM_static_SegmentTemplate";
import DummyMediaElement from "../../../dist/es2017/experimental/tools/DummyMediaElement";
import RxPlayer from "../../../dist/es2017";
import waitForPlayerState from "../../utils/waitForPlayerState";
import { lockLowestBitrates } from "../../utils/bitrates";
import sleep from "../../utils/sleep";
import { generateGetLicenseForFakeLicense } from "../utils/drm_utils";
import expectPlayerError from "../utils/expect_player_error";
import isNullOrUndefined from "../../utils/is_null_or_undefined";

describe("DRM: Basic use cases", function () {
  const { url, transport } = manifestInfos;
  let player;
  const oldMediaSourceSupported = MediaSource.isTypeSupported;

  async function loadEncryptedContent(args) {
    const { error, ...opts } = args;
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      ...opts,
    });
    if (isNullOrUndefined(error)) {
      try {
        await waitForPlayerState(player, "LOADED", ["LOADING"]);
      } catch (err) {
        throw player.getError() ?? err;
      }
      expect(player.getError()).toBeNull();
    } else {
      await waitForPlayerState(player, "STOPPED", ["LOADING"]);
      expectPlayerError(player, error);
    }
  }

  let dummy;
  beforeEach(() => {
    MediaSource.isTypeSupported = () => true;
    dummy = new DummyMediaElement();
    player = new RxPlayer({ videoElement: dummy });
    player.setWantedBufferAhead(10);
  });

  afterEach(async () => {
    MediaSource.isTypeSupported = oldMediaSourceSupported;
    player.dispose();
  });

  it("should trigger error if no key system option is provided", async function () {
    lockLowestBitrates(player);
    await loadEncryptedContent({
      keySystems: undefined,
      error: {
        code: "MEDIA_IS_ENCRYPTED_ERROR",
        type: "ENCRYPTED_MEDIA_ERROR",
      },
    });
  });

  it("should load the content if licenses are returned", async function () {
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = [];
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            askedKeyIds,
          }),
        },
      ],
    });
    expect(player.getVideoRepresentation().id).toEqual("8-80399bf5");
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(askedKeyIds.length).toEqual(expectedKeyIds.length);

    player.stop();
    await sleep(10);
    expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
  });

  it("should close sessions after stop if `closeSessionsOnStop` is set", async function () {
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = [];
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            askedKeyIds,
          }),
          closeSessionsOnStop: true,
        },
      ],
    });
    expect(player.getVideoRepresentation().id).toEqual("8-80399bf5");
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(askedKeyIds.length).toEqual(expectedKeyIds.length);
    expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
    player.stop();
    await sleep(10);
    expect(dummy.mediaKeys.dummySessions).toHaveLength(0);
  });

  it("should trigger specific error if the license request fails", async function () {
    lockLowestBitrates(player);
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense() {
            throw new Error("I do not work");
          },
        },
      ],
      error: {
        code: "KEY_LOAD_ERROR",
        type: "ENCRYPTED_MEDIA_ERROR",
      },
    });
  });

  it("should fallback from license request error with a `fallbackOnLastTry` toggle on", async function () {
    const failingKeyIds = {
      "90953e096cb249a3a2607a5fefead499": {
        fallbackOnLastTry: true,
      },
    };
    const expectedKeyIds = [
      "90953e096cb249a3a2607a5fefead499",
      "585f233f307246f19fa46dc22c66a014",
      "80399bf58a2140148053e27e748e98c1",
    ];
    const askedKeyIds = [];
    let brokenVideoLock = 0;
    player.addEventListener("newAvailablePeriods", (p) => {
      player.lockVideoRepresentations({
        periodId: p[0].id,
        representations: ["11-90953e09", "12-90953e09"],
      });
    });
    player.addEventListener("brokenRepresentationsLock", (lock) => {
      if (lock.trackType === "video") {
        brokenVideoLock++;
      }
    });
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            askedKeyIds,
            failingKeyIds,
          }),
        },
      ],
    });
    expect(brokenVideoLock).toEqual(1);
    expect(["8-80399bf5", "9-80399bf5", "10-80399bf5"]).toContain(
      player.getVideoRepresentation().id,
    );
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
  });

  it("should fail LOADING if all video keys are fallbacked with `fallbackOnLastTry`", async function () {
    lockLowestBitrates(player);
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: generateGetLicenseForFakeLicense({
            failingKeyIds: {
              "90953e096cb249a3a2607a5fefead499": {
                fallbackOnLastTry: true,
              },
              "80399bf58a2140148053e27e748e98c1": {
                fallbackOnLastTry: true,
              },
              "80399bf58a2140148053e27e748e98c0": {
                fallbackOnLastTry: true,
              },
            },
          }),
        },
      ],
      error: {
        code: "NO_PLAYABLE_REPRESENTATION",
        type: "MEDIA_ERROR",
      },
    });
  });

  it("should fail LOADING if first video keys are fallbacked with `fallbackOnLastTry` and last with bad keystatuses", async function () {
    lockLowestBitrates(player);
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: generateGetLicenseForFakeLicense({
            failingKeyIds: {
              "80399bf58a2140148053e27e748e98c1": {
                fallbackOnLastTry: true,
              },
            },
            policyLevels: {
              "90953e096cb249a3a2607a5fefead499": 200,
              "80399bf58a2140148053e27e748e98c0": 200,
            },
          }),
        },
      ],
      error: {
        code: "KEY_STATUS_CHANGE_ERROR",
        type: "ENCRYPTED_MEDIA_ERROR",
      },
    });
  });

  it("should fail LOADING if first video keys are fallbacked with `fallbackOnLastTry` and last with fallbacked bad keystatuses", async function () {
    lockLowestBitrates(player);
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicenseForFakeLicense({
            failingKeyIds: {
              "80399bf58a2140148053e27e748e98c1": {
                fallbackOnLastTry: true,
              },
            },
            policyLevels: {
              "90953e096cb249a3a2607a5fefead499": 200,
              "80399bf58a2140148053e27e748e98c0": 200,
            },
          }),
        },
      ],
      error: {
        code: "NO_PLAYABLE_REPRESENTATION",
        type: "MEDIA_ERROR",
      },
    });
  });

  it("should fail LOADING if last video keys are fallbacked with `fallbackOnLastTry` and first with bad keystatuses", async function () {
    lockLowestBitrates(player);
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense: generateGetLicenseForFakeLicense({
            failingKeyIds: {
              "90953e096cb249a3a2607a5fefead499": {
                fallbackOnLastTry: true,
              },
              "80399bf58a2140148053e27e748e98c0": {
                fallbackOnLastTry: true,
              },
            },
            policyLevels: { "80399bf58a2140148053e27e748e98c1": 200 },
          }),
        },
      ],
      error: {
        code: "KEY_STATUS_CHANGE_ERROR",
        type: "ENCRYPTED_MEDIA_ERROR",
      },
    });
  });

  it("should fail LOADING if last video keys are fallbacked with `fallbackOnLastTry` and first with fallbacked bad keystatuses", async function () {
    lockLowestBitrates(player);
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicenseForFakeLicense({
            failingKeyIds: {
              "90953e096cb249a3a2607a5fefead499": {
                fallbackOnLastTry: true,
              },
              "80399bf58a2140148053e27e748e98c0": {
                fallbackOnLastTry: true,
              },
            },
            policyLevels: { "80399bf58a2140148053e27e748e98c1": 200 },
          }),
        },
      ],
      error: {
        code: "NO_PLAYABLE_REPRESENTATION",
        type: "MEDIA_ERROR",
      },
    });
  });

  it("should continue LOADING if all video are fallbacked but onVideoTracksNotPlayable is set to continue", async function () {
    lockLowestBitrates(player);
    await loadEncryptedContent({
      onVideoTracksNotPlayable: "continue",
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicenseForFakeLicense({
            failingKeyIds: {
              "90953e096cb249a3a2607a5fefead499": {
                fallbackOnLastTry: true,
              },
              "80399bf58a2140148053e27e748e98c0": {
                fallbackOnLastTry: true,
              },
              "80399bf58a2140148053e27e748e98c1": {
                fallbackOnLastTry: true,
              },
            },
          }),
        },
      ],
    });
    expect(player.getVideoTrack()).toEqual(null);
    expect(player.getAvailableVideoTracks()).toEqual([]);
  });

  it('should fallback from an `"output-restricted"` MediaKeyStatus under the corresponding option', async function () {
    let brokenVideoLock = 0;
    player.addEventListener("newAvailablePeriods", (p) => {
      player.lockVideoRepresentations({
        periodId: p[0].id,
        representations: ["11-90953e09", "12-90953e09"],
      });
    });
    player.addEventListener("brokenRepresentationsLock", (lock) => {
      if (lock.trackType === "video") {
        brokenVideoLock++;
      }
    });
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds: [
              "90953e096cb249a3a2607a5fefead499",
              "585f233f307246f19fa46dc22c66a014",
              "80399bf58a2140148053e27e748e98c1",
            ],
            policyLevels: {
              "90953e096cb249a3a2607a5fefead499": 200,
            },
          }),
        },
      ],
    });
    expect(brokenVideoLock).toEqual(1);
    expect(["8-80399bf5", "9-80399bf5", "10-80399bf5"]).toContain(
      player.getVideoRepresentation().id,
    );
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
  });

  it('should continue from an `"output-restricted"` MediaKeyStatus under the corresponding option', async function () {
    const policyLevels = { "90953e096cb249a3a2607a5fefead499": 200 };
    const expectedKeyIds = [
      "90953e096cb249a3a2607a5fefead499",
      "585f233f307246f19fa46dc22c66a014",
      "80399bf58a2140148053e27e748e98c1",
    ];
    const askedKeyIds = [];
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "continue",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            askedKeyIds,
            policyLevels,
          }),
        },
      ],
    });

    let brokenVideoLock = 0;
    player.addEventListener("newAvailablePeriods", (p) => {
      player.lockVideoRepresentations({
        periodId: p[0].id,
        representations: ["11-90953e09", "12-90953e09"],
      });
    });
    player.addEventListener("brokenRepresentationsLock", (lock) => {
      if (lock.trackType === "video") {
        brokenVideoLock++;
      }
    });

    await sleep(150);
    expect(player.getPlayerState()).toEqual("LOADING");
    expect(brokenVideoLock).toEqual(0);
    expect(["11-90953e09", "12-90953e09"]).toContain(player.getVideoRepresentation().id);
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(player.getError()).toBeNull();
  });

  it('should fail from an `"output-restricted"` MediaKeyStatus under the corresponding option', async function () {
    player.setWantedBufferAhead(10);
    const expectedKeyIds = [
      "90953e096cb249a3a2607a5fefead499",
      "585f233f307246f19fa46dc22c66a014",
      "80399bf58a2140148053e27e748e98c1",
    ];
    let brokenVideoLock = 0;
    player.addEventListener("newAvailablePeriods", (p) => {
      player.lockVideoRepresentations({
        periodId: p[0].id,
        representations: ["11-90953e09", "12-90953e09"],
      });
    });
    player.addEventListener("brokenRepresentationsLock", (lock) => {
      if (lock.trackType === "video") {
        brokenVideoLock++;
      }
    });
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "error",
          getLicense: generateGetLicenseForFakeLicense({
            policyLevels: {
              "90953e096cb249a3a2607a5fefead499": 200,
            },
            expectedKeyIds,
          }),
        },
      ],
      error: {
        code: "KEY_STATUS_CHANGE_ERROR",
        type: "ENCRYPTED_MEDIA_ERROR",
      },
    });
    expect(brokenVideoLock).toEqual(0);
  });

  it('should fallback from an `"output-restricted"` MediaKeyStatus happening during playback under the corresponding option', async function () {
    const policyLevels = { "90953e096cb249a3a2607a5fefead499": 50 };
    const expectedKeyIds = [
      "90953e096cb249a3a2607a5fefead499",
      "585f233f307246f19fa46dc22c66a014",
      "80399bf58a2140148053e27e748e98c1",
    ];
    let brokenVideoLock = 0;
    player.addEventListener("newAvailablePeriods", (p) => {
      player.lockVideoRepresentations({
        periodId: p[0].id,
        representations: ["11-90953e09", "12-90953e09"],
      });
    });
    player.addEventListener("brokenRepresentationsLock", (lock) => {
      if (lock.trackType === "video") {
        brokenVideoLock++;
      }
    });
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            policyLevels,
          }),
        },
      ],
    });
    expect(brokenVideoLock).toEqual(0);
    expect(["11-90953e09", "12-90953e09"]).toContain(player.getVideoRepresentation().id);
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    await sleep(200);
    dummy.mediaKeys.dummySessions.forEach((s) => {
      s.updatePolicyLevel(10);
    });
    await waitForPlayerState(player, "PAUSED", ["PLAYING", "RELOADING"]);
    expect(brokenVideoLock).toEqual(1);
    expect(["8-80399bf5", "9-80399bf5", "10-80399bf5"]).toContain(
      player.getVideoRepresentation().id,
    );
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(player.getError()).toBeNull();
  });

  it('should fail from an `"output-restricted"` MediaKeyStatus happening during playback under the corresponding option', async function () {
    player.setWantedBufferAhead(10);
    const policyLevels = { "90953e096cb249a3a2607a5fefead499": 50 };
    const expectedKeyIds = [
      "90953e096cb249a3a2607a5fefead499",
      "585f233f307246f19fa46dc22c66a014",
      "80399bf58a2140148053e27e748e98c1",
    ];
    let brokenVideoLock = 0;
    player.addEventListener("newAvailablePeriods", (p) => {
      player.lockVideoRepresentations({
        periodId: p[0].id,
        representations: ["11-90953e09", "12-90953e09"],
      });
    });
    player.addEventListener("brokenRepresentationsLock", (lock) => {
      if (lock.trackType === "video") {
        brokenVideoLock++;
      }
    });
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "error",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            policyLevels,
          }),
        },
      ],
    });

    expect(brokenVideoLock).toEqual(0);
    expect(["11-90953e09", "12-90953e09"]).toContain(player.getVideoRepresentation().id);
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");

    await sleep(50);
    dummy.mediaKeys.dummySessions.forEach((s) => {
      s.updatePolicyLevel(10);
    });
    await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("KEY_STATUS_CHANGE_ERROR");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
    expect(brokenVideoLock).toEqual(0);
  });

  it("should re-allow a Representation re-becoming decipherable", async function () {
    let brokenVideoLock = 0;
    player.addEventListener("newAvailablePeriods", (p) => {
      player.lockVideoRepresentations({
        periodId: p[0].id,
        representations: ["11-90953e09", "12-90953e09"],
      });
    });
    player.addEventListener("brokenRepresentationsLock", (lock) => {
      if (lock.trackType === "video") {
        brokenVideoLock++;
      }
    });
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds: [
              "90953e096cb249a3a2607a5fefead499",
              "585f233f307246f19fa46dc22c66a014",
              "80399bf58a2140148053e27e748e98c1",
            ],
            policyLevels: {
              "90953e096cb249a3a2607a5fefead499": 50,
            },
          }),
        },
      ],
    });
    expect(brokenVideoLock).toEqual(0);
    expect(["11-90953e09", "12-90953e09"]).toContain(player.getVideoRepresentation().id);
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");

    await sleep(200);
    dummy.mediaKeys.dummySessions.forEach((s) => {
      s.updatePolicyLevel(10);
    });
    await waitForPlayerState(player, "PAUSED", ["PLAYING", "RELOADING"]);
    expect(brokenVideoLock).toEqual(1);
    expect(["8-80399bf5", "9-80399bf5", "10-80399bf5"]).toContain(
      player.getVideoRepresentation().id,
    );
    expect(player.getVideoTrack().representations.map((r) => r.id)).not.toContain(
      "12-90953e09",
    );
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(player.getError()).toBeNull();

    dummy.mediaKeys.dummySessions.forEach((s) => {
      s.updatePolicyLevel(100);
    });
    await sleep(100);
    expect(player.getVideoTrack().representations.map((r) => r.id)).toContain(
      "12-90953e09",
    );
    player.lockVideoRepresentations(["12-90953e09"]);
    expect(player.getVideoRepresentation().id).toEqual("12-90953e09");
  });

  it('should change track if all Representation from the current one are `"output-restricted"` with the corresponding option', async function () {
    const policyLevels = {
      "90953e096cb249a3a2607a5fefead499": 50,
      "80399bf58a2140148053e27e748e98c1": 50,
    };
    const expectedKeyIds = [
      "90953e096cb249a3a2607a5fefead499",
      "585f233f307246f19fa46dc22c66a014",
      "80399bf58a2140148053e27e748e98c1",
      "80399bf58a2140148053e27e748e98c0",
    ];
    let brokenVideoLock = 0;
    let videoTrackUpdate = 0;
    player.addEventListener("newAvailablePeriods", (p) => {
      player.lockVideoRepresentations({
        periodId: p[0].id,
        representations: ["11-90953e09", "12-90953e09"],
      });
    });
    player.addEventListener("trackUpdate", (obj) => {
      if (obj.trackType === "video") {
        if (obj.reason === "no-playable-representation") {
          videoTrackUpdate++;
        }
      }
    });
    player.addEventListener("brokenRepresentationsLock", (lock) => {
      if (lock.trackType === "video") {
        brokenVideoLock++;
      }
    });
    await loadEncryptedContent({
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicenseForFakeLicense({
            expectedKeyIds,
            policyLevels,
          }),
        },
      ],
    });
    expect(brokenVideoLock).toEqual(0);
    expect(["11-90953e09", "12-90953e09"]).toContain(player.getVideoRepresentation().id);
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");

    await sleep(200);
    dummy.mediaKeys.dummySessions.forEach((s) => {
      s.updatePolicyLevel(10);
    });
    await waitForPlayerState(player, "PAUSED", ["PLAYING", "RELOADING"]);

    await sleep(200);
    expect(brokenVideoLock).toEqual(1);
    expect(videoTrackUpdate).toEqual(0);
    dummy.mediaKeys.dummySessions.forEach((s) => {
      s.updatePolicyLevel(10);
    });
    await waitForPlayerState(player, "PAUSED", ["PLAYING", "RELOADING"]);

    expect(brokenVideoLock).toEqual(1);
    expect(videoTrackUpdate).toEqual(1);
    expect(["1-80399bf5", "2-80399bf5", "3-80399bf5"]).toContain(
      player.getVideoRepresentation().id,
    );
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(player.getError()).toBeNull();
  });

  it("should let a time window for an audio track reset if no license for video can be fetched while audio is disabled", async function () {
    const noPlayableTracksReceived = [];
    player.addEventListener("newAvailablePeriods", (periods) => {
      expect(player.getVideoTrack(periods[0].id)).not.toBeNull();
      player.disableAudioTrack(periods[0].id);
    });
    player.addEventListener("noPlayableTrack", (npt) => {
      noPlayableTracksReceived.push(npt);
      const period = player.getAvailablePeriods()[0];
      player.setAudioTrack({
        periodId: period.id,
        trackId: player.getAvailableAudioTracks(period.id)[0].id,
      });
    });
    await loadEncryptedContent({
      onVideoTracksNotPlayable: "continue",
      keySystems: [
        {
          type: "com.microsoft.playready",
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicenseForFakeLicense({
            failingKeyIds: {
              "90953e096cb249a3a2607a5fefead499": {
                fallbackOnLastTry: true,
              },
              "80399bf58a2140148053e27e748e98c0": {
                fallbackOnLastTry: true,
              },
              "80399bf58a2140148053e27e748e98c1": {
                fallbackOnLastTry: true,
              },
            },
          }),
        },
      ],
    });
    expect(player.getAvailableVideoTracks()).toEqual([]);
    expect(noPlayableTracksReceived.length).toEqual(1);
    expect(noPlayableTracksReceived[0].trackType).toEqual("video");
    expect(noPlayableTracksReceived[0].period.id).toEqual(
      player.getAvailablePeriods()[0].id,
    );
  });
});
