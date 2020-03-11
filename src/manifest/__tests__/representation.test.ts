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

import Representation from "../representation";

const minimalIndex = {
  getInitSegment() { return null; },
  getSegments() { return []; },
  shouldRefresh() { return false; },
  getFirstPosition() : undefined { return ; },
  getLastPosition() : undefined { return ; },
  checkDiscontinuity() { return -1; },
  isSegmentStillAvailable() : undefined { return ; },
  canBeOutOfSyncError() : true { return true; },
  isFinished() : true { return true; },
  _replace() { /* noop */ },
  _update() { /* noop */ },
  _addSegments() { /* noop */ },
};

describe("Manifest - Representation", () => {
  it("should be able to create Representation with the minimum arguments given", () => {
    const args = { bitrate: 12, id: "test", index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("undefined;codecs=\"undefined\"");
  });

  it("should be able to add a height attribute", () => {
    const args = { bitrate: 12, id: "test", height: 57, index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(57);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("undefined;codecs=\"undefined\"");
  });

  it("should be able to add a width attribute", () => {
    const args = { bitrate: 12, id: "test", width: 2, index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(2);
    expect(representation.getMimeTypeString()).toBe("undefined;codecs=\"undefined\"");
  });

  it("should be able to add a codecs attribute", () => {
    const args = { bitrate: 12, id: "test", codecs: "vp9", index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe("vp9");
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("undefined;codecs=\"vp9\"");
  });

  it("should be able to add a mimeType attribute", () => {
    const args = { bitrate: 12, id: "test", mimeType: "audio/mp4", index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe("audio/mp4");
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("audio/mp4;codecs=\"undefined\"");
  });

  it("should be able to add a contentProtections attribute", () => {
    const args = {
      bitrate: 12,
      id: "test",
      index: minimalIndex,
      contentProtections: {
        keyIds: [{ keyId: new Uint8Array([45]) }],
        initData: { cenc: [{ systemId: "EDEF", data: new Uint8Array([78]) }] },
      },
    };
    const representation = new Representation(args);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(args.contentProtections);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("undefined;codecs=\"undefined\"");
  });

  it("should be able to add a frameRate attribute", () => {
    const args = { bitrate: 12, id: "test", frameRate: "1/60", index: minimalIndex };
    const representation = new Representation(args);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe("1/60");
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("undefined;codecs=\"undefined\"");
  });

  it("should be able to return an exploitable codecs + mimeType string", () => {
    const args1 = { bitrate: 12, id: "test", index: minimalIndex };
    expect(new Representation(args1).getMimeTypeString())
      .toBe("undefined;codecs=\"undefined\"");

    const args2 = { bitrate: 12, id: "test", mimeType: "foo", index: minimalIndex };
    expect(new Representation(args2).getMimeTypeString())
      .toBe("foo;codecs=\"undefined\"");

    const args3 = { bitrate: 12, id: "test", codecs: "bar", index: minimalIndex };
    expect(new Representation(args3).getMimeTypeString())
      .toBe("undefined;codecs=\"bar\"");

    const args4 = {
      bitrate: 12,
      id: "test",
      mimeType: "foo",
      codecs: "bar",
      index: minimalIndex,
    };
    expect(new Representation(args4).getMimeTypeString())
      .toBe("foo;codecs=\"bar\"");
  });
});
