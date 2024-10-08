import { describe, beforeEach, afterEach, it, expect } from "vitest";
import { manifestInfos } from "../../contents/DASH_DRM_static_SegmentTemplate";
import DummyMediaElement from "../../../dist/es2017/experimental/tools/DummyMediaElement";
import RxPlayer from "../../../dist/es2017";
import waitForPlayerState from "../../utils/waitForPlayerState";
import { lockLowestBitrates } from "../../utils/bitrates";

const textDecoder = new TextDecoder();

describe("DRM: getLicenseConfig", () => {
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

  it("should attempt the license request 3 times by default", async function () {
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = {};
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicense(challenge) {
            const challengeStr = textDecoder.decode(challenge);
            const challengeObj = JSON.parse(challengeStr);
            challengeObj.keyIds.forEach((kid) => {
              expect(expectedKeyIds).toContain(kid);
              if (askedKeyIds[kid] === undefined) {
                askedKeyIds[kid] = 1;
              } else {
                askedKeyIds[kid]++;
              }
              throw new Error("A");
            });
          },
        },
      ],
    });
    await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    expect(askedKeyIds).toHaveProperty(expectedKeyIds[0]);
    expect(askedKeyIds).toHaveProperty(expectedKeyIds[1]);
    if (askedKeyIds[expectedKeyIds[0]] === 3) {
      expect(askedKeyIds[expectedKeyIds[1]]).toEqual(2);
    } else if (askedKeyIds[expectedKeyIds[1]] === 3) {
      expect(askedKeyIds[expectedKeyIds[0]]).toEqual(2);
    } else {
      throw new Error("No key has 3 request attempts: " + JSON.stringify(askedKeyIds));
    }
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("KEY_LOAD_ERROR");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
  });

  it("should update the number of attempts with getLicenseConfig", async function () {
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = {};
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicenseConfig: {
            retry: 1,
          },
          getLicense(challenge) {
            const challengeStr = textDecoder.decode(challenge);
            const challengeObj = JSON.parse(challengeStr);
            challengeObj.keyIds.forEach((kid) => {
              expect(expectedKeyIds).toContain(kid);
              if (askedKeyIds[kid] === undefined) {
                askedKeyIds[kid] = 1;
              } else {
                askedKeyIds[kid]++;
              }
              throw new Error("A");
            });
          },
        },
      ],
    });
    await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    expect(askedKeyIds).toHaveProperty(expectedKeyIds[0]);
    expect(askedKeyIds).toHaveProperty(expectedKeyIds[1]);
    if (askedKeyIds[expectedKeyIds[0]] === 2) {
      expect(askedKeyIds[expectedKeyIds[1]]).toEqual(1);
    } else if (askedKeyIds[expectedKeyIds[1]] === 2) {
      expect(askedKeyIds[expectedKeyIds[0]]).toEqual(1);
    } else {
      throw new Error("No key has 3 request attempts: " + JSON.stringify(askedKeyIds));
    }
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("KEY_LOAD_ERROR");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
  });

  it("should not retry if `noRetry` is set on the error", async function () {
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = {};
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicenseConfig: {
            retry: 1,
          },
          getLicense(challenge) {
            const challengeStr = textDecoder.decode(challenge);
            const challengeObj = JSON.parse(challengeStr);
            challengeObj.keyIds.forEach((kid) => {
              expect(expectedKeyIds).toContain(kid);
              if (askedKeyIds[kid] === undefined) {
                askedKeyIds[kid] = 1;
              } else {
                askedKeyIds[kid]++;
              }
              const error = new Error("A");
              error.noRetry = true;
              throw error;
            });
          },
        },
      ],
    });
    await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    expect(Object.keys(askedKeyIds)).toHaveLength(1);
    expect(askedKeyIds[Object.keys(askedKeyIds)[0]]).toEqual(1);
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("KEY_LOAD_ERROR");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
  });

  it("should update a timeout with getLicenseConfig", async function () {
    lockLowestBitrates(player);
    const expectedKeyIds = [
      "80399bf58a2140148053e27e748e98c1",
      "585f233f307246f19fa46dc22c66a014",
    ];
    const askedKeyIds = {};
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          getLicenseConfig: {
            retry: 0,
            timeout: 1,
          },
          getLicense(challenge) {
            return new Promise((resolve) => {
              setTimeout(() => {
                const challengeStr = textDecoder.decode(challenge);
                const challengeObj = JSON.parse(challengeStr);
                challengeObj.keyIds.forEach((kid) => {
                  expect(expectedKeyIds).toContain(kid);
                  if (askedKeyIds[kid] === undefined) {
                    askedKeyIds[kid] = 1;
                  } else {
                    askedKeyIds[kid]++;
                  }
                });
                resolve({});
              }, 10);
            });
          },
        },
      ],
    });
    await waitForPlayerState(player, "STOPPED", ["LOADING"]);
    expect(askedKeyIds).toEqual({});
    const error = player.getError();
    expect(error).not.toBeNull();
    expect(error.code).to.equal("KEY_LOAD_ERROR");
    expect(error.name).to.equal("EncryptedMediaError");
    expect(error.type).to.equal("ENCRYPTED_MEDIA_ERROR");
  });
});
