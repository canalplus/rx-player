import { expect } from "chai";
import sleep from "../utils/sleep.js";
import sinon from "sinon";
import RxPlayer from "../../../src";
import DynamicMock from "../mocks/dash_dynamic_SegmentTimeline.js";

/**
 * Test various cases of errors due to Manifest loading or parsing.
 */

describe("manifest error management", function () {
  let player;
  let fakeServer;

  beforeEach(() => {
    player = new RxPlayer();
    fakeServer = sinon.fakeServer.create();
  });

  afterEach(() => {
    player.dispose();
    fakeServer.restore();
  });

  it("should retry to download the manifest 5 times", async () => {
    const clock = sinon.useFakeTimers();
    fakeServer.respondWith("GET", DynamicMock.manifest.url, res =>
      res.respond(500));

    player.loadVideo({
      url: DynamicMock.manifest.url,
      transport: "dash",
    });

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    fakeServer.respond();

    clock.restore();

    await sleep(1);
    expect(player.getManifest()).to.equal(null);
    const error = player.getError();
    expect(error).not.to.equal(null);
    expect(error.type).to.equal(RxPlayer.ErrorTypes.NETWORK_ERROR);
    expect(error.code).to.equal(RxPlayer.ErrorCodes.PIPELINE_LOAD_ERROR);
  });

  it("should parse the manifest if it works the second time", async () => {
    const clock = sinon.useFakeTimers();

    let requestCounter = 0;
    fakeServer.respondWith("GET", DynamicMock.manifest.url, (xhr) => {
      return ++requestCounter >= 2 ?
        xhr.respond(
          200,
          { "Content-Type": DynamicMock.manifest.contentType },
          DynamicMock.manifest.data
        ) :
        xhr.respond(500);
    });

    player.loadVideo({
      url: DynamicMock.manifest.url,
      transport: "dash",
    });

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);
    fakeServer.respond();

    clock.restore();

    await sleep(1);
    expect(player.getManifest()).not.to.equal(null);
    expect(typeof player.getManifest()).to.equal("object");
    expect(player.getError()).to.equal(null);
  });

  it("should parse the manifest if it works the third time", async () => {
    const clock = sinon.useFakeTimers();

    let requestCounter = 0;
    fakeServer.respondWith("GET", DynamicMock.manifest.url, (xhr) => {
      return ++requestCounter >= 3 ?
        xhr.respond(
          200,
          { "Content-Type": DynamicMock.manifest.contentType },
          DynamicMock.manifest.data
        ) :
        xhr.respond(500);
    });

    player.loadVideo({
      url: DynamicMock.manifest.url,
      transport: "dash",
    });

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);
    fakeServer.respond();

    clock.restore();

    await sleep(1);
    expect(player.getManifest()).not.to.equal(null);
    expect(typeof player.getManifest()).to.equal("object");
    expect(player.getError()).to.equal(null);
  });

  it("should parse the manifest if it works the fourth time", async () => {
    const clock = sinon.useFakeTimers();

    let requestCounter = 0;
    fakeServer.respondWith("GET", DynamicMock.manifest.url, (xhr) => {
      return ++requestCounter >= 4 ?
        xhr.respond(
          200,
          { "Content-Type": DynamicMock.manifest.contentType },
          DynamicMock.manifest.data
        ) :
        xhr.respond(500);
    });

    player.loadVideo({
      url: DynamicMock.manifest.url,
      transport: "dash",
    });

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);
    fakeServer.respond();

    clock.restore();

    await sleep(1);
    expect(player.getManifest()).not.to.equal(null);
    expect(typeof player.getManifest()).to.equal("object");
    expect(player.getError()).to.equal(null);
  });

  it("should parse the manifest if it works the fifth time", async () => {
    const clock = sinon.useFakeTimers();

    let requestCounter = 0;
    fakeServer.respondWith("GET", DynamicMock.manifest.url, (xhr) => {
      return ++requestCounter >= 5 ?
        xhr.respond(
          200,
          { "Content-Type": DynamicMock.manifest.contentType },
          DynamicMock.manifest.data
        ) :
        xhr.respond(500);
    });

    player.loadVideo({
      url: DynamicMock.manifest.url,
      transport: "dash",
    });

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);
    fakeServer.respond();

    clock.restore();

    await sleep(1);
    expect(player.getManifest()).not.to.equal(null);
    expect(typeof player.getManifest()).to.equal("object");
    expect(player.getError()).to.equal(null);
  });
});
