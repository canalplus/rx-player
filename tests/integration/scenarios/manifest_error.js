import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../../src";
import Mock from "../mocks/dash_dynamic_SegmentTimeline.js";

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

  it("should retry to download the manifest 4 times", async function (done) {
    const clock = sinon.useFakeTimers();
    fakeServer.respondWith("GET", Mock.manifest.url,
      [
        500,
        { "Content-Type": Mock.manifest.contentType },
        Mock.manifest.data,
      ]);

    player.loadVideo({
      url: Mock.manifest.url,
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

    const error = player.getError();
    expect(error).not.to.equal(null);
    expect(error.type).to.equal(RxPlayer.ErrorTypes.NETWORK_ERROR);
    expect(error.code).to.equal(RxPlayer.ErrorCodes.PIPELINE_LOAD_ERROR);
    clock.restore();
    done();
  });

  it("should parse the manifest if it works the fourth time", (done) => {
    const clock = sinon.useFakeTimers();

    let requestCounter = 0;
    fakeServer.respondWith("GET", Mock.manifest.url, (xhr) => {
      return ++requestCounter >= 5 ?
        xhr.respond(
          200,
          { "Content-Type": Mock.manifest.contentType },
          Mock.manifest.data
        ) :
        xhr.respond(
          500,
          { "Content-Type": Mock.manifest.contentType }
        );
    });

    player.loadVideo({
      url: Mock.manifest.url,
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

    expect(typeof player.getManifest()).to.equal("object");
    expect(player.getError()).to.equal(null);

    clock.restore();
    done();
  });
});
