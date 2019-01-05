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
import Representation from "../representation";

const minimalIndex = {
  getInitSegment() { return null; },
  getSegments() { return []; },
  shouldRefresh() { return false; },
  getFirstPosition() : undefined { return ; },
  getLastPosition() : undefined { return ; },
  checkDiscontinuity() { return -1; },
  _update() { /* noop */ },
  _addSegments() { /* noop */ },
};

describe("manifest - Representation", () => {
  it("should be able to create Representation with the minimum arguments given", () => {
    const args = { bitrate: 12, id: "test", index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).to.equal("test");
    expect(representation.bitrate).to.equal(12);
    expect(representation.index).to.equal(minimalIndex);
    expect(representation.codec).to.equal(undefined);
    expect(representation.contentProtections).to.equal(undefined);
    expect(representation.frameRate).to.equal(undefined);
    expect(representation.height).to.equal(undefined);
    expect(representation.mimeType).to.equal(undefined);
    expect(representation.width).to.equal(undefined);
    expect(representation.getMimeTypeString()).to.equal("undefined;codecs=\"undefined\"");
  });

  it("should be able to add a height attribute", () => {
    const args = { bitrate: 12, id: "test", height: 57, index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).to.equal("test");
    expect(representation.bitrate).to.equal(12);
    expect(representation.index).to.equal(minimalIndex);
    expect(representation.codec).to.equal(undefined);
    expect(representation.contentProtections).to.equal(undefined);
    expect(representation.frameRate).to.equal(undefined);
    expect(representation.height).to.equal(57);
    expect(representation.mimeType).to.equal(undefined);
    expect(representation.width).to.equal(undefined);
    expect(representation.getMimeTypeString()).to.equal("undefined;codecs=\"undefined\"");
  });

  it("should be able to add a width attribute", () => {
    const args = { bitrate: 12, id: "test", width: 2, index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).to.equal("test");
    expect(representation.bitrate).to.equal(12);
    expect(representation.index).to.equal(minimalIndex);
    expect(representation.codec).to.equal(undefined);
    expect(representation.contentProtections).to.equal(undefined);
    expect(representation.frameRate).to.equal(undefined);
    expect(representation.height).to.equal(undefined);
    expect(representation.mimeType).to.equal(undefined);
    expect(representation.width).to.equal(2);
    expect(representation.getMimeTypeString()).to.equal("undefined;codecs=\"undefined\"");
  });

  it("should be able to add a codecs attribute", () => {
    const args = { bitrate: 12, id: "test", codecs: "vp9", index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).to.equal("test");
    expect(representation.bitrate).to.equal(12);
    expect(representation.index).to.equal(minimalIndex);
    expect(representation.codec).to.equal("vp9");
    expect(representation.contentProtections).to.equal(undefined);
    expect(representation.frameRate).to.equal(undefined);
    expect(representation.height).to.equal(undefined);
    expect(representation.mimeType).to.equal(undefined);
    expect(representation.width).to.equal(undefined);
    expect(representation.getMimeTypeString()).to.equal("undefined;codecs=\"vp9\"");
  });

  it("should be able to add a mimeType attribute", () => {
    const args = { bitrate: 12, id: "test", mimeType: "audio/mp4", index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).to.equal("test");
    expect(representation.bitrate).to.equal(12);
    expect(representation.index).to.equal(minimalIndex);
    expect(representation.codec).to.equal(undefined);
    expect(representation.contentProtections).to.equal(undefined);
    expect(representation.frameRate).to.equal(undefined);
    expect(representation.height).to.equal(undefined);
    expect(representation.mimeType).to.equal("audio/mp4");
    expect(representation.width).to.equal(undefined);
    expect(representation.getMimeTypeString()).to.equal("audio/mp4;codecs=\"undefined\"");
  });

  it("should be able to add a contentProtections attribute", () => {
    const args = {
      bitrate: 12,
      id: "test",
      index: minimalIndex,
      contentProtections: [{
        keyId: "AAFF",
      }],
    };
    const representation = new Representation(args);
    expect(representation.id).to.equal("test");
    expect(representation.bitrate).to.equal(12);
    expect(representation.index).to.equal(minimalIndex);
    expect(representation.codec).to.equal(undefined);
    expect(representation.contentProtections).to.equal(args.contentProtections);
    expect(representation.frameRate).to.equal(undefined);
    expect(representation.height).to.equal(undefined);
    expect(representation.mimeType).to.equal(undefined);
    expect(representation.width).to.equal(undefined);
    expect(representation.getMimeTypeString()).to.equal("undefined;codecs=\"undefined\"");
  });

  it("should be able to add a frameRate attribute", () => {
    const args = { bitrate: 12, id: "test", frameRate: "1/60", index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).to.equal("test");
    expect(representation.bitrate).to.equal(12);
    expect(representation.index).to.equal(minimalIndex);
    expect(representation.codec).to.equal(undefined);
    expect(representation.contentProtections).to.equal(undefined);
    expect(representation.frameRate).to.equal("1/60");
    expect(representation.height).to.equal(undefined);
    expect(representation.mimeType).to.equal(undefined);
    expect(representation.width).to.equal(undefined);
    expect(representation.getMimeTypeString()).to.equal("undefined;codecs=\"undefined\"");
  });

  it("should be able to return an exploitable mimeTypeString", () => {
    const args1 = { bitrate: 12, id: "test", index: minimalIndex };
    expect(new Representation(args1).getMimeTypeString())
      .to.equal("undefined;codecs=\"undefined\"");

    const args2 = { bitrate: 12, id: "test", mimeType: "foo", index: minimalIndex };
    expect(new Representation(args2).getMimeTypeString())
      .to.equal("foo;codecs=\"undefined\"");

    const args3 = { bitrate: 12, id: "test", codecs: "bar", index: minimalIndex };
    expect(new Representation(args3).getMimeTypeString())
      .to.equal("undefined;codecs=\"bar\"");

    const args4 = {
      bitrate: 12,
      id: "test",
      mimeType: "foo",
      codecs: "bar",
      index: minimalIndex,
    };
    expect(new Representation(args4).getMimeTypeString())
      .to.equal("foo;codecs=\"bar\"");
  });
});
