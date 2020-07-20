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

/* tslint:disable no-unsafe-any */
const minimalIndex = { getInitSegment() { return null; },
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
                       _addSegments() { /* noop */ } };

const defaultIsCodecSupported = jest.fn(() => true);

describe("Manifest - Representation", () => {
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    defaultIsCodecSupported.mockClear();
  });

  it("should be able to create Representation with the minimum arguments given", () => {
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: defaultIsCodecSupported }));
    const Representation = require("../representation").default;
    const args = { bitrate: 12,
                   id: "test",
                   index: minimalIndex };
    const representation = new Representation(args, { type: "audio" });
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe(";codecs=\"\"");
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(defaultIsCodecSupported).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a height attribute", () => {
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: defaultIsCodecSupported }));
    const Representation = require("../representation").default;
    const args = { bitrate: 12, id: "test", height: 57, index: minimalIndex };
    const representation = new Representation(args, { type: "video" });
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(57);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe(";codecs=\"\"");
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(defaultIsCodecSupported).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a width attribute", () => {
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: defaultIsCodecSupported }));
    const Representation = require("../representation").default;
    const args = { bitrate: 12, id: "test", width: 2, index: minimalIndex };
    const representation = new Representation(args, { type: "video" });
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(2);
    expect(representation.getMimeTypeString()).toBe(";codecs=\"\"");
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(defaultIsCodecSupported).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a codecs attribute", () => {
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: defaultIsCodecSupported }));
    const Representation = require("../representation").default;
    const args = { bitrate: 12,
                   id: "test",
                   codecs: "vp9",
                   index: minimalIndex };
    const representation = new Representation(args, { type: "audio" });
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe("vp9");
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe(";codecs=\"vp9\"");
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(defaultIsCodecSupported).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a mimeType attribute", () => {
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: defaultIsCodecSupported }));
    const Representation = require("../representation").default;
    const args = { bitrate: 12,
                   id: "test",
                   mimeType: "audio/mp4",
                   index: minimalIndex };
    const representation = new Representation(args, { type: "audio" });
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe(undefined);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe("audio/mp4");
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("audio/mp4;codecs=\"\"");
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(defaultIsCodecSupported).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a contentProtections attribute", () => {
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: defaultIsCodecSupported }));
    const Representation = require("../representation").default;
    const args = { bitrate: 12,
                   id: "test",
                   index: minimalIndex,
                   mimeType: "video/mp4",
                   codecs: "vp12",
                   contentProtections: { keyIds: [{ keyId: new Uint8Array([45]) }],
                                         initData: {
                                           cenc: [{
                                             systemId: "EDEF",
                                             data: new Uint8Array([78]),
                                           }],
                                         } } };
    const representation = new Representation(args, { type: "video" });
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe("vp12");
    expect(representation.contentProtections).toBe(args.contentProtections);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe("video/mp4");
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("video/mp4;codecs=\"vp12\"");
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(defaultIsCodecSupported).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a frameRate attribute", () => {
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: defaultIsCodecSupported }));
    const Representation = require("../representation").default;
    const args = { bitrate: 12,
                   id: "test",
                   frameRate: "1/60",
                   mimeType: "audio/mp4",
                   codecs: "mp4a.40.2",
                   index: minimalIndex };
    const representation = new Representation(args, { type: "audio" });
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe("mp4a.40.2");
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe("1/60");
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe("audio/mp4");
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("audio/mp4;codecs=\"mp4a.40.2\"");
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(defaultIsCodecSupported).toHaveBeenCalledTimes(1);
  });

  it("should be able to return an exploitable codecs + mimeType string", () => {
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: defaultIsCodecSupported }));
    const Representation = require("../representation").default;
    const args1 = { bitrate: 12,
                    id: "test",
                    index: minimalIndex };
    expect(new Representation(args1, { type: "audio" }).getMimeTypeString())
      .toBe(";codecs=\"\"");

    const args2 = { bitrate: 12,
                    id: "test",
                    mimeType: "foo",
                    index: minimalIndex };
    expect(new Representation(args2, { type: "audio" }).getMimeTypeString())
      .toBe("foo;codecs=\"\"");

    const args3 = { bitrate: 12,
                    id: "test",
                    codecs: "bar",
                    index: minimalIndex };
    expect(new Representation(args3, { type: "audio" }).getMimeTypeString())
      .toBe(";codecs=\"bar\"");

    const args4 = { bitrate: 12,
                    id: "test",
                    mimeType: "foo",
                    codecs: "bar",
                    index: minimalIndex };
    expect(new Representation(args4, { type: "audio" }).getMimeTypeString())
      .toBe("foo;codecs=\"bar\"");
  });

  it("should set `isSupported` of non-supported codecs or mime-type to `false`", () => {
    const notSupportedSpy = jest.fn(() => false);
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: notSupportedSpy }));
    const Representation = require("../representation").default;
    const args = { bitrate: 12,
                   id: "test",
                   frameRate: "1/60",
                   mimeType: "audio/mp4",
                   codecs: "mp4a.40.2",
                   index: minimalIndex };
    const representation = new Representation(args, { type: "audio" });
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codec).toBe("mp4a.40.2");
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe("1/60");
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe("audio/mp4");
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe("audio/mp4;codecs=\"mp4a.40.2\"");
    expect(representation.isSupported).toBe(false);
    expect(representation.decipherable).toBe(undefined);
    expect(notSupportedSpy).toHaveBeenCalledTimes(1);
    expect(notSupportedSpy).toHaveBeenCalledWith("audio/mp4;codecs=\"mp4a.40.2\"");
  });

  it("should not check support for a custom SourceBuffer", () => {
    const notSupportedSpy = jest.fn(() => false);
    jest.mock("../../compat", () => ({ __esModule: true as const,
                                       isCodecSupported: notSupportedSpy }));
    const Representation = require("../representation").default;
    const args = { bitrate: 12,
                   id: "test",
                   frameRate: "1/60",
                   mimeType: "bip",
                   codecs: "boop",
                   index: minimalIndex };
    const representation = new Representation(args, { type: "foo" });
    expect(representation.codec).toBe("boop");
    expect(representation.mimeType).toBe("bip");
    expect(representation.getMimeTypeString()).toBe("bip;codecs=\"boop\"");
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(notSupportedSpy).toHaveBeenCalledTimes(0);
  });
});
/* tslint:enable no-unsafe-any */
