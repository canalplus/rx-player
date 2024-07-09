import { describe, beforeEach, afterEach, it, expect } from "vitest";
import { manifestInfos } from "../../contents/DASH_DRM_static_SegmentTemplate";
import DummyMediaElement from "../../../dist/es2017/experimental/tools/DummyMediaElement";
import RxPlayer from "../../../dist/es2017";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import { lockLowestBitrates } from "../../utils/bitrates";
import sleep from "../../utils/sleep";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

describe("DRM: Basic use cases", function () {
  const { url, transport } = manifestInfos;
  let player;
  const oldMediaSourceSupported = MediaSource.isTypeSupported;

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
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
    });
    await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("MEDIA_IS_ENCRYPTED_ERROR");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
  });

  it("should load the content if licenses are returned", async function () {
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
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
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
          }),
        },
      ],
    });
    await waitForLoadedStateAfterLoadVideo(player);
    expect(player.getVideoRepresentation().id).toEqual("8-80399bf5");
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(player.getError()).toBeNull();
    expect(askedKeyIds.length).toEqual(expectedKeyIds.length);

    player.stop();
    await sleep(10);
    expect(dummy.mediaKeys.sessions).toHaveLength(2);
  });

  it("should close sessions after stop if `closeSessionsOnStop` is set", async function () {
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
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
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
          }),
          closeSessionsOnStop: true,
        },
      ],
    });
    await waitForLoadedStateAfterLoadVideo(player);
    expect(player.getVideoRepresentation().id).toEqual("8-80399bf5");
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(player.getError()).toBeNull();
    expect(askedKeyIds.length).toEqual(expectedKeyIds.length);
    expect(dummy.mediaKeys.sessions).toHaveLength(2);

    player.stop();
    await sleep(10);
    expect(dummy.mediaKeys.sessions).toHaveLength(0);
  });

  it("should trigger specific error if the license request fails", async function () {
    lockLowestBitrates(player);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense() {
            throw new Error("I do not work");
          },
        },
      ],
    });
    await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("KEY_LOAD_ERROR");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
  });

  it("should fallback from license request error with a `fallbackOnLastTry` toggle on", async function () {
    const failingKeyIds = ["90953e096cb249a3a2607a5fefead499"];
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
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
            failingKeyIds,
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
    await waitForLoadedStateAfterLoadVideo(player);
    expect(brokenVideoLock).toEqual(1);
    expect(["8-80399bf5", "9-80399bf5", "10-80399bf5"]).toContain(
      player.getVideoRepresentation().id,
    );
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(player.getError()).toBeNull();
  });

  it('should fallback from an `"output-restricted"` MediaKeyStatus under the corresponding option', async function () {
    const highPolicyLevelKeyIds = ["90953e096cb249a3a2607a5fefead499"];
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
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
            highPolicyLevelKeyIds,
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
    await waitForLoadedStateAfterLoadVideo(player);
    expect(brokenVideoLock).toEqual(1);
    expect(["8-80399bf5", "9-80399bf5", "10-80399bf5"]).toContain(
      player.getVideoRepresentation().id,
    );
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");
    expect(player.getError()).toBeNull();
  });

  it('should continue from an `"output-restricted"` MediaKeyStatus under the corresponding option', async function () {
    const highPolicyLevelKeyIds = ["90953e096cb249a3a2607a5fefead499"];
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
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
            highPolicyLevelKeyIds,
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
    const highPolicyLevelKeyIds = ["90953e096cb249a3a2607a5fefead499"];
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
          onKeyOutputRestricted: "error",
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
            highPolicyLevelKeyIds,
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
    await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("KEY_STATUS_CHANGE_ERROR");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
    expect(brokenVideoLock).toEqual(0);
  });

  it('should fallback from an `"output-restricted"` MediaKeyStatus happening during playback under the corresponding option', async function () {
    const mediumPolicyLevelKeyIds = ["90953e096cb249a3a2607a5fefead499"];
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
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
            mediumPolicyLevelKeyIds,
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

    await waitForLoadedStateAfterLoadVideo(player);
    expect(brokenVideoLock).toEqual(0);
    expect(["11-90953e09", "12-90953e09"]).toContain(player.getVideoRepresentation().id);
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");

    await sleep(50);
    dummy.mediaKeys.sessions.forEach((s) => {
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
    const mediumPolicyLevelKeyIds = ["90953e096cb249a3a2607a5fefead499"];
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
          onKeyOutputRestricted: "error",
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
            mediumPolicyLevelKeyIds,
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

    await waitForLoadedStateAfterLoadVideo(player);
    expect(brokenVideoLock).toEqual(0);
    expect(["11-90953e09", "12-90953e09"]).toContain(player.getVideoRepresentation().id);
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");

    await sleep(50);
    dummy.mediaKeys.sessions.forEach((s) => {
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
    const mediumPolicyLevelKeyIds = ["90953e096cb249a3a2607a5fefead499"];
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
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
            mediumPolicyLevelKeyIds,
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

    await waitForLoadedStateAfterLoadVideo(player);
    expect(brokenVideoLock).toEqual(0);
    expect(["11-90953e09", "12-90953e09"]).toContain(player.getVideoRepresentation().id);
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");

    await sleep(50);
    dummy.mediaKeys.sessions.forEach((s) => {
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

    dummy.mediaKeys.sessions.forEach((s) => {
      s.updatePolicyLevel(100);
    });
    await sleep(10);
    expect(player.getVideoTrack().representations.map((r) => r.id)).toContain(
      "12-90953e09",
    );
    player.lockVideoRepresentations(["12-90953e09"]);
    expect(player.getVideoRepresentation().id).toEqual("12-90953e09");
  });

  it('should change track if all Representation from the current one are `"output-restricted"` with the corresponding option', async function () {
    const mediumPolicyLevelKeyIds = [
      "90953e096cb249a3a2607a5fefead499",
      "80399bf58a2140148053e27e748e98c1",
    ];
    const expectedKeyIds = [
      "90953e096cb249a3a2607a5fefead499",
      "585f233f307246f19fa46dc22c66a014",
      "80399bf58a2140148053e27e748e98c1",
      "80399bf58a2140148053e27e748e98c0",
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
          onKeyOutputRestricted: "fallback",
          getLicense: generateGetLicense({
            expectedKeyIds,
            askedKeyIds,
            mediumPolicyLevelKeyIds,
          }),
        },
      ],
    });
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

    await waitForLoadedStateAfterLoadVideo(player);
    expect(brokenVideoLock).toEqual(0);
    expect(["11-90953e09", "12-90953e09"]).toContain(player.getVideoRepresentation().id);
    expect(player.getAudioRepresentation().id).toEqual("15-585f233f");

    await sleep(50);
    dummy.mediaKeys.sessions.forEach((s) => {
      s.updatePolicyLevel(10);
    });
    await waitForPlayerState(player, "PAUSED", ["PLAYING", "RELOADING"]);

    await sleep(50);
    expect(brokenVideoLock).toEqual(1);
    expect(videoTrackUpdate).toEqual(0);
    dummy.mediaKeys.sessions.forEach((s) => {
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

  function generateGetLicense({
    expectedKeyIds,
    askedKeyIds,
    highPolicyLevelKeyIds,
    mediumPolicyLevelKeyIds,
    failingKeyIds,
  }) {
    return function getLicense(challenge, messageType) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            expect(messageType).toEqual("license-request");
            const challengeStr = textDecoder.decode(challenge);
            const challengeObj = JSON.parse(challengeStr);
            const keys = {};
            challengeObj.keyIds.forEach((kid) => {
              if (Array.isArray(expectedKeyIds)) {
                expect(expectedKeyIds).toContain(kid);
              }
              if (Array.isArray(askedKeyIds)) {
                askedKeyIds.push(kid);
              }
              if (Array.isArray(failingKeyIds) && failingKeyIds.includes(kid)) {
                const error = new Error("Should fallback!");
                error.noRetry = true;
                error.fallbackOnLastTry = true;
                reject(error);
              }
              let policyLevel = 0;
              if (
                Array.isArray(highPolicyLevelKeyIds) &&
                highPolicyLevelKeyIds.includes(kid)
              ) {
                policyLevel = 200;
              } else if (
                Array.isArray(mediumPolicyLevelKeyIds) &&
                mediumPolicyLevelKeyIds.includes(kid)
              ) {
                policyLevel = 50;
              }
              keys[kid] = {
                policyLevel,
              };
            });
            const license = {
              type: "license",
              persistent: false,
              keys,
            };
            const licenseU8 = textEncoder.encode(JSON.stringify(license));
            resolve(licenseU8.buffer);
          } catch (e) {
            reject(e);
          }
        }, 50);
      });
    };
  }
});
