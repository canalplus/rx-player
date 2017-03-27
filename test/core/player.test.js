const expect = require("chai").expect;
const Player = require("main/core/player");

describe("main player", function() {
  const transport = { manifestPipeline: {}, segmentPipeline: {}, textTrackPipeline: {} };

  it("has constructor", function() {
    expect(new Player({ transport })).to.be.an("object");
  });

  it("is stopped on instanciation", function() {
    expect(new Player({ transport }).getPlayerState()).to.equal("STOPPED");
  });

  it("check instanceof HTMLVideoElement", function() {
    expect(() => new Player({ videoElement: document.createElement("li") })).to.throw();
  });

  it("can get volume", function() {
    expect(new Player({ transport }).getVolume()).to.be.a("number");
    expect(new Player({ transport }).getVolume()).to.equal(1);
  });

  it("can set volume", function() {
    const pl = new Player({ transport });
    pl.setVolume(0);
    expect(pl.getVolume()).to.equal(0);
  });

  it("throw error if volume not double", function() {
    expect(() => new Player({ transport }).setVolume("troll")).to.throw();
  });

  it("can mute", function() {
    const pl = new Player({ transport }); pl.mute();
    expect(pl.getVolume()).to.equal(0);
  });

  it("can unmute", function() {
    const pl = new Player({ transport });
    pl.setVolume(0.7);
    expect(pl.getVolume()).to.equal(0.7);
    pl.mute();
    expect(pl.getVolume()).to.equal(0);
    pl.unMute();
    expect(pl.getVolume()).to.equal(0.7);
  });

  it("can unmute a muted player", function() {
    const pl = new Player({ transport });
    pl.setVolume(0);
    pl.unMute();
    expect(pl.getVolume()).to.equal(0.1);
  });

  xit("can seek", function() {
    return expect(new Player({ transport }).seekTo(1)).to.eventually.equal(1);
  });

  it("throw error if currentTime not double", function() {
    return expect(new Player({ transport }).seekTo("troll")).to.be.rejected;
  });

  it("is an eventemitter", function(done) {
    const player = new Player({ transport });
    expect(player.addEventListener).to.be.a("function");
    expect(player.removeEventListener).to.be.a("function");
    player.addEventListener("foo", function() { done(); });
    player.trigger("foo");
  });
});
