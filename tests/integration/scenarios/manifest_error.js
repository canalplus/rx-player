import { expect } from "chai";
import sleep from "../../utils/sleep.js";
import sinon from "sinon";

import RxPlayer from "../../../src";

import {
  manifestInfos,
  Manifest_URL,
} from "../../contents/DASH_dynamic_SegmentTimeline";

/**
 *  Workaround to provide a "real" sleep function, which does not depend on
 *  sinon fakeTimers.
 *  Here, the environment's setTimeout function is stored before being stubed
 *  by sinon, allowing to sleep the wanted time without waiting sinon's clock
 *  to tick.
 *  @param {Number} [ms=0]
 *  @returns {Promise}
 */
const sleepWithoutSinonStub = (function() {
  const timeoutFn = window.setTimeout;
  return function _nextTick(ms = 0) {
    return new Promise((res) => {
      timeoutFn(res, ms);
    });
  };
})();

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
    fakeServer.respondWith("GET", Manifest_URL.url, res =>
      res.respond(500));

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();

    clock.restore();

    await sleep(5);
    expect(player.getManifest()).to.equal(null);
    const error = player.getError();
    expect(error).not.to.equal(null);
    expect(error.type).to.equal(RxPlayer.ErrorTypes.NETWORK_ERROR);
    expect(error.code).to.equal(RxPlayer.ErrorCodes.PIPELINE_LOAD_ERROR);
  });

  it("should parse the manifest if it works the second time", async () => {
    const clock = sinon.useFakeTimers();

    let requestCounter = 0;
    fakeServer.respondWith("GET", Manifest_URL.url, (xhr) => {
      return ++requestCounter >= 2 ?
        xhr.respond(
          200,
          { "Content-Type": Manifest_URL.contentType },
          Manifest_URL.data
        ) :
        xhr.respond(500);
    });

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);
    await sleepWithoutSinonStub();
    fakeServer.respond();

    clock.restore();

    await sleep(5);
    expect(player.getManifest()).not.to.equal(null);
    expect(typeof player.getManifest()).to.equal("object");
    expect(player.getError()).to.equal(null);
  });

  it("should parse the manifest if it works the third time", async () => {
    const clock = sinon.useFakeTimers();

    let requestCounter = 0;
    fakeServer.respondWith("GET", Manifest_URL.url, (xhr) => {
      return ++requestCounter >= 3 ?
        xhr.respond(
          200,
          { "Content-Type": Manifest_URL.contentType },
          Manifest_URL.data
        ) :
        xhr.respond(500);
    });

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);
    await sleepWithoutSinonStub();
    fakeServer.respond();

    clock.restore();

    await sleep(5);
    expect(player.getManifest()).not.to.equal(null);
    expect(typeof player.getManifest()).to.equal("object");
    expect(player.getError()).to.equal(null);
  });

  it("should parse the manifest if it works the fourth time", async () => {
    const clock = sinon.useFakeTimers();

    let requestCounter = 0;
    fakeServer.respondWith("GET", Manifest_URL.url, (xhr) => {
      return ++requestCounter >= 4 ?
        xhr.respond(
          200,
          { "Content-Type": Manifest_URL.contentType },
          Manifest_URL.data
        ) :
        xhr.respond(500);
    });

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);
    await sleepWithoutSinonStub();
    fakeServer.respond();

    clock.restore();

    await sleep(5);
    expect(player.getManifest()).not.to.equal(null);
    expect(typeof player.getManifest()).to.equal("object");
    expect(player.getError()).to.equal(null);
  });

  it("should parse the manifest if it works the fifth time", async () => {
    const clock = sinon.useFakeTimers();

    let requestCounter = 0;
    fakeServer.respondWith("GET", Manifest_URL.url, (xhr) => {
      return ++requestCounter >= 5 ?
        xhr.respond(
          200,
          { "Content-Type": Manifest_URL.contentType },
          Manifest_URL.data
        ) :
        xhr.respond(500);
    });

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutSinonStub();
    fakeServer.respond();
    clock.tick(5000);

    expect(player.getError()).to.equal(null);
    await sleepWithoutSinonStub();
    fakeServer.respond();

    clock.restore();

    await sleep(5);
    expect(player.getManifest()).not.to.equal(null);
    expect(typeof player.getManifest()).to.equal("object");
    expect(player.getError()).to.equal(null);
  });
});
