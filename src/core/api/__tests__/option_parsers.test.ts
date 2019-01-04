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
import * as sinon from "sinon";
import config from "../../../config";
import {
  parseConstructorOptions,
} from "../option_parsers";

const {
  // DEFAULT_AUTO_PLAY,
  DEFAULT_INITIAL_BITRATES,
  DEFAULT_LIMIT_VIDEO_WIDTH,
  // DEFAULT_MANUAL_BITRATE_SWITCHING_MODE,
  DEFAULT_MAX_BITRATES,
  DEFAULT_MAX_BUFFER_AHEAD,
  DEFAULT_MAX_BUFFER_BEHIND,
  // DEFAULT_SHOW_NATIVE_SUBTITLE,
  // DEFAULT_TEXT_TRACK_MODE,
  DEFAULT_THROTTLE_WHEN_HIDDEN,
  DEFAULT_WANTED_BUFFER_AHEAD,
} = config;

describe("API - parseConstructorOptions", () => {
  const videoElement = document.createElement("video");
  let createElementStub : sinon.SinonStub|undefined;
  beforeEach(() => {
    createElementStub = sinon.stub(document, "createElement").callsFake((type) => {
      if (type !== "video") {
        throw new Error("Invalid element");
      }
      return videoElement;
    });
  });

  afterEach(() => {
    if (createElementStub) {
      createElementStub.restore();
    }
  });
  const defaultConstructorOptions = {
    maxBufferAhead: DEFAULT_MAX_BUFFER_AHEAD,
    maxBufferBehind: DEFAULT_MAX_BUFFER_BEHIND,
    wantedBufferAhead: DEFAULT_WANTED_BUFFER_AHEAD,
    limitVideoWidth: DEFAULT_LIMIT_VIDEO_WIDTH,
    throttleWhenHidden: DEFAULT_THROTTLE_WHEN_HIDDEN,
    videoElement,
    initialVideoBitrate: DEFAULT_INITIAL_BITRATES.video,
    initialAudioBitrate: DEFAULT_INITIAL_BITRATES.audio,
    maxAudioBitrate: DEFAULT_MAX_BITRATES.audio,
    maxVideoBitrate: DEFAULT_MAX_BITRATES.video,
    stopAtEnd: true,
  };
  it("should create default values if no option is given", () => {
    expect(parseConstructorOptions({})).to.eql(defaultConstructorOptions);
  });

  it("should authorize setting a maxBufferAhead", () => {
    expect(parseConstructorOptions({ maxBufferAhead: 0 })).to.eql({
      ...defaultConstructorOptions,
      maxBufferAhead: 0,
    });
    expect(parseConstructorOptions({ maxBufferAhead: 10 })).to.eql({
      ...defaultConstructorOptions,
      maxBufferAhead: 10,
    });
    expect(parseConstructorOptions({ maxBufferAhead: Infinity })).to.eql({
      ...defaultConstructorOptions,
      maxBufferAhead: Infinity,
    });
  });

  it("should authorize setting a maxBufferBehind", () => {
    expect(parseConstructorOptions({ maxBufferBehind: 0 })).to.eql({
      ...defaultConstructorOptions,
      maxBufferBehind: 0,
    });
    expect(parseConstructorOptions({ maxBufferBehind: 10 })).to.eql({
      ...defaultConstructorOptions,
      maxBufferBehind: 10,
    });
    expect(parseConstructorOptions({ maxBufferBehind: Infinity })).to.eql({
      ...defaultConstructorOptions,
      maxBufferBehind: Infinity,
    });
  });

  it("should authorize setting a wantedBufferAhead", () => {
    expect(parseConstructorOptions({ wantedBufferAhead: 0 })).to.eql({
      ...defaultConstructorOptions,
      wantedBufferAhead: 0,
    });
    expect(parseConstructorOptions({ wantedBufferAhead: 10 })).to.eql({
      ...defaultConstructorOptions,
      wantedBufferAhead: 10,
    });
    expect(parseConstructorOptions({ wantedBufferAhead: Infinity })).to.eql({
      ...defaultConstructorOptions,
      wantedBufferAhead: Infinity,
    });
  });

  it("should authorize setting a limitVideoWidth option", () => {
    expect(parseConstructorOptions({ limitVideoWidth: false })).to.eql({
      ...defaultConstructorOptions,
      limitVideoWidth: false,
    });
    expect(parseConstructorOptions({ limitVideoWidth: true })).to.eql({
      ...defaultConstructorOptions,
      limitVideoWidth: true,
    });
  });

  it("should authorize setting a throttleWhenHidden option", () => {
    expect(parseConstructorOptions({ throttleWhenHidden: false })).to.eql({
      ...defaultConstructorOptions,
      throttleWhenHidden: false,
    });
    expect(parseConstructorOptions({ throttleWhenHidden: true })).to.eql({
      ...defaultConstructorOptions,
      throttleWhenHidden: true,
    });
  });

  /* tslint:disable:max-line-length */
  it("should authorize setting a videoElement option which can be any media element", () => {
  /* tslint:enable:max-line-length */
    if (createElementStub) {
      createElementStub.restore();
    }
    const _videoElement = document.createElement("video");
    const parsed1 = parseConstructorOptions({ videoElement: _videoElement });
    expect(parsed1).to.eql({
      ...defaultConstructorOptions,
      videoElement: _videoElement,
    });
    expect(parsed1.videoElement).to.equal(_videoElement);

    const audioElement = document.createElement("audio");
    const parsed2 = parseConstructorOptions({ videoElement: audioElement });
    expect(parsed2).to.eql({
      ...defaultConstructorOptions,
      videoElement: audioElement,
    });
    expect(parsed2.videoElement).to.equal(audioElement);
  });

  it("should authorize setting an initialVideoBitrate", () => {
    expect(parseConstructorOptions({ initialVideoBitrate: -1 })).to.eql({
      ...defaultConstructorOptions,
      initialVideoBitrate: -1,
    });
    expect(parseConstructorOptions({ initialVideoBitrate: 0 })).to.eql({
      ...defaultConstructorOptions,
      initialVideoBitrate: 0,
    });
    expect(parseConstructorOptions({ initialVideoBitrate: 10 })).to.eql({
      ...defaultConstructorOptions,
      initialVideoBitrate: 10,
    });
    expect(parseConstructorOptions({ initialVideoBitrate: Infinity })).to.eql({
      ...defaultConstructorOptions,
      initialVideoBitrate: Infinity,
    });
  });

  it("should authorize setting an initialAudioBitrate", () => {
    expect(parseConstructorOptions({ initialAudioBitrate: -1 })).to.eql({
      ...defaultConstructorOptions,
      initialAudioBitrate: -1,
    });
    expect(parseConstructorOptions({ initialAudioBitrate: 0 })).to.eql({
      ...defaultConstructorOptions,
      initialAudioBitrate: 0,
    });
    expect(parseConstructorOptions({ initialAudioBitrate: 10 })).to.eql({
      ...defaultConstructorOptions,
      initialAudioBitrate: 10,
    });
    expect(parseConstructorOptions({ initialAudioBitrate: Infinity })).to.eql({
      ...defaultConstructorOptions,
      initialAudioBitrate: Infinity,
    });
  });

  it("should authorize setting a maxVideoBitrate", () => {
    expect(parseConstructorOptions({ maxVideoBitrate: -1 })).to.eql({
      ...defaultConstructorOptions,
      maxVideoBitrate: -1,
    });
    expect(parseConstructorOptions({ maxVideoBitrate: 0 })).to.eql({
      ...defaultConstructorOptions,
      maxVideoBitrate: 0,
    });
    expect(parseConstructorOptions({ maxVideoBitrate: 10 })).to.eql({
      ...defaultConstructorOptions,
      maxVideoBitrate: 10,
    });
    expect(parseConstructorOptions({ maxVideoBitrate: Infinity })).to.eql({
      ...defaultConstructorOptions,
      maxVideoBitrate: Infinity,
    });
  });

  it("should authorize setting a maxAudioBitrate", () => {
    expect(parseConstructorOptions({ maxAudioBitrate: -1 })).to.eql({
      ...defaultConstructorOptions,
      maxAudioBitrate: -1,
    });
    expect(parseConstructorOptions({ maxAudioBitrate: 0 })).to.eql({
      ...defaultConstructorOptions,
      maxAudioBitrate: 0,
    });
    expect(parseConstructorOptions({ maxAudioBitrate: 10 })).to.eql({
      ...defaultConstructorOptions,
      maxAudioBitrate: 10,
    });
    expect(parseConstructorOptions({ maxAudioBitrate: Infinity })).to.eql({
      ...defaultConstructorOptions,
      maxAudioBitrate: Infinity,
    });
  });

  it("should authorize setting a stopAtEnd option", () => {
    expect(parseConstructorOptions({ stopAtEnd: false })).to.eql({
      ...defaultConstructorOptions,
      stopAtEnd: false,
    });
    expect(parseConstructorOptions({ stopAtEnd: true })).to.eql({
      ...defaultConstructorOptions,
      stopAtEnd: true,
    });
  });

  it("should throw if the maxBufferAhead given is not a number", () => {
    expect(() => parseConstructorOptions({ maxBufferAhead: "a" as any })).to.throw();
    expect(() => parseConstructorOptions({ maxBufferAhead: /a/ as any })).to.throw();
    expect(() => parseConstructorOptions({ maxBufferAhead: {} as any })).to.throw();
  });

  it("should throw if the maxBufferBehind given is not a number", () => {
    expect(() => parseConstructorOptions({ maxBufferBehind: "a" as any })).to.throw();
    expect(() => parseConstructorOptions({ maxBufferBehind: /a/ as any })).to.throw();
    expect(() => parseConstructorOptions({ maxBufferBehind: {} as any })).to.throw();
  });

  it("should throw if the wantedBufferAhead given is not a number", () => {
    expect(() => parseConstructorOptions({ wantedBufferAhead: "a" as any })).to.throw();
    expect(() => parseConstructorOptions({ wantedBufferAhead: /a/ as any })).to.throw();
    expect(() => parseConstructorOptions({ wantedBufferAhead: {} as any })).to.throw();
  });

  it("should throw if the videoElement given is not an HTMLMediaElement", () => {
    expect(() => parseConstructorOptions({ videoElement: "a" as any })).to.throw();
    expect(() => parseConstructorOptions({ videoElement: /a/ as any })).to.throw();
    expect(() => parseConstructorOptions({ videoElement: {} as any })).to.throw();
    expect(() => parseConstructorOptions({ videoElement: [] as any })).to.throw();
    expect(() => parseConstructorOptions({ videoElement: 0 as any })).to.throw();
    expect(() => parseConstructorOptions({
      videoElement: document.createElement("div") as any,
    })).to.throw();
  });

  it("should throw if the initialVideoBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ initialVideoBitrate: "a" as any })).to.throw();
    expect(() => parseConstructorOptions({ initialVideoBitrate: /a/ as any })).to.throw();
    expect(() => parseConstructorOptions({ initialVideoBitrate: {} as any })).to.throw();
  });

  it("should throw if the initialAudioBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ initialAudioBitrate: "a" as any })).to.throw();
    expect(() => parseConstructorOptions({ initialAudioBitrate: /a/ as any })).to.throw();
    expect(() => parseConstructorOptions({ initialAudioBitrate: {} as any })).to.throw();
  });

  it("should throw if the maxVideoBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ maxVideoBitrate: "a" as any })).to.throw();
    expect(() => parseConstructorOptions({ maxVideoBitrate: /a/ as any })).to.throw();
    expect(() => parseConstructorOptions({ maxVideoBitrate: {} as any })).to.throw();
  });

  it("should throw if the maxAudioBitrate given is not a number", () => {
    expect(() => parseConstructorOptions({ maxAudioBitrate: "a" as any })).to.throw();
    expect(() => parseConstructorOptions({ maxAudioBitrate: /a/ as any })).to.throw();
    expect(() => parseConstructorOptions({ maxAudioBitrate: {} as any })).to.throw();
  });
});
