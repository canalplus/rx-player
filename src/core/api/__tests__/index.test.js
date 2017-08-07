/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from "chai";
import Player from "../index.js";

describe("main player", function() {
  const transport = { manifestPipeline: {}, segmentPipeline: {}, textTrackPipeline: {} };

  xit("has constructor", function() {
    expect(new Player({ transport })).to.be.an("object");
  });

  xit("is stopped on instanciation", function() {
    expect(new Player({ transport }).getPlayerState()).to.equal("STOPPED");
  });

  xit("check instanceof HTMLVideoElement", function() {
    expect(() => new Player({ videoElement: document.createElement("li") })).to.throw();
  });

  xit("can get volume", function() {
    expect(new Player({ transport }).getVolume()).to.be.a("number");
    expect(new Player({ transport }).getVolume()).to.equal(1);
  });

  xit("can set volume", function() {
    const pl = new Player({ transport });
    pl.setVolume(0);
    expect(pl.getVolume()).to.equal(0);
  });

  xit("throw error if volume not double", function() {
    expect(() => new Player({ transport }).setVolume("troll")).to.throw();
  });

  xit("can mute", function() {
    const pl = new Player({ transport }); pl.mute();
    expect(pl.getVolume()).to.equal(0);
  });

  xit("can unmute", function() {
    const pl = new Player({ transport });
    pl.setVolume(0.7);
    expect(pl.getVolume()).to.equal(0.7);
    pl.mute();
    expect(pl.getVolume()).to.equal(0);
    pl.unMute();
    expect(pl.getVolume()).to.equal(0.7);
  });

  xit("can unmute a muted player", function() {
    const pl = new Player({ transport });
    pl.setVolume(0);
    pl.unMute();
    expect(pl.getVolume()).to.equal(0.1);
  });

  xit("is an eventemitter", function(done) {
    const player = new Player({ transport });
    expect(player.addEventListener).to.be.a("function");
    expect(player.removeEventListener).to.be.a("function");
    player.addEventListener("foo", function() { done(); });
    player.trigger("foo");
  });
});
