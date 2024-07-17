import { describe, it, expect, vi } from "vitest";
import type { IParsedRepresentation } from "../../../parsers/manifest";
import CodecSupportManager from "../codecSupportList";
import Representation from "../representation";
import type { IRepresentationIndex } from "../representation_index";

const minimalIndex: IRepresentationIndex = {
  getInitSegment() {
    return null;
  },
  getSegments() {
    return [];
  },
  isInitialized() {
    return false;
  },
  addPredictedSegments() {
    return;
  },
  initialize() {
    return;
  },
  shouldRefresh() {
    return false;
  },
  getFirstAvailablePosition(): undefined {
    return;
  },
  getLastAvailablePosition(): undefined {
    return;
  },
  getEnd(): undefined {
    return;
  },
  awaitSegmentBetween(): undefined {
    return;
  },
  checkDiscontinuity() {
    return null;
  },
  isSegmentStillAvailable(): undefined {
    return;
  },
  isStillAwaitingFutureSegments(): boolean {
    return true;
  },
  canBeOutOfSyncError(): true {
    return true;
  },
  _replace() {
    return;
  },
  _update() {
    return;
  },
};

describe("Manifest - Representation", () => {
  const cache = new CodecSupportManager([]);
  it("should be able to create Representation with the minimum arguments given", () => {
    const args = {
      bitrate: 12,
      id: "test",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "audio", cache);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codecs).toEqual([]);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe(';codecs=""');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
    expect(spyCodecCache).toHaveBeenCalledWith("", "", false);
  });

  it("should be able to add a height attribute", () => {
    const args = {
      bitrate: 12,
      id: "test",
      height: 57,
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "video", cache);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codecs).toEqual([]);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(57);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe(';codecs=""');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a width attribute", () => {
    const args = {
      bitrate: 12,
      id: "test",
      width: 2,
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "video", cache);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codecs).toEqual([]);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(2);
    expect(representation.getMimeTypeString()).toBe(';codecs=""');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a codecs attribute", () => {
    const args = {
      bitrate: 12,
      id: "test",
      codecs: "vp9",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "audio", cache);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codecs).toEqual(["vp9"]);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe(';codecs="vp9"');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a supplementalCodecs attribute", () => {
    const args = {
      bitrate: 12,
      id: "test",
      codecs: "vp9",
      supplementalCodecs: "test",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "audio", cache);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codecs).toEqual(["test", "vp9"]);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe(undefined);
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe(';codecs="test"');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a mimeType attribute", () => {
    const args = {
      bitrate: 12,
      id: "test",
      mimeType: "audio/mp4",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "audio", cache);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codecs).toEqual([]);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe("audio/mp4");
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe('audio/mp4;codecs=""');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a contentProtections attribute", () => {
    const args = {
      bitrate: 12,
      id: "test",
      index: minimalIndex,
      mimeType: "video/mp4",
      codecs: "vp12",
      contentProtections: {
        keyIds: [{ keyId: new Uint8Array([45]) }],
        initData: {
          cenc: [
            {
              systemId: "EDEF",
              data: new Uint8Array([78]),
            },
          ],
        },
      },
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "video", cache);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codecs).toEqual(["vp12"]);
    expect(representation.contentProtections).toBe(args.contentProtections);
    expect(representation.frameRate).toBe(undefined);
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe("video/mp4");
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe('video/mp4;codecs="vp12"');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });

  it("should be able to add a frameRate attribute", () => {
    const args = {
      bitrate: 12,
      id: "test",
      frameRate: "1/60",
      mimeType: "audio/mp4",
      codecs: "mp4a.40.2",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "audio", cache);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codecs).toEqual(["mp4a.40.2"]);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe("1/60");
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe("audio/mp4");
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe('audio/mp4;codecs="mp4a.40.2"');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });

  it("should be able to return an exploitable codecs + mimeType string", () => {
    const args1 = {
      bitrate: 12,
      id: "test",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    expect(new Representation(args1, "audio", cache).getMimeTypeString()).toBe(
      ';codecs=""',
    );

    const args2 = {
      bitrate: 12,
      id: "test",
      mimeType: "foo",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    expect(new Representation(args2, "audio", cache).getMimeTypeString()).toBe(
      'foo;codecs=""',
    );

    const args3 = {
      bitrate: 12,
      id: "test",
      codecs: "bar",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    expect(new Representation(args3, "audio", cache).getMimeTypeString()).toBe(
      ';codecs="bar"',
    );

    const args4 = {
      bitrate: 12,
      id: "test",
      mimeType: "foo",
      codecs: "bar",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    expect(new Representation(args4, "audio", cache).getMimeTypeString()).toBe(
      'foo;codecs="bar"',
    );
  });

  it("should set `isSupported` of non-supported codecs or mime-type to `false`", () => {
    const args = {
      bitrate: 12,
      id: "test",
      frameRate: "1/60",
      mimeType: "audio/mp4",
      codecs: "mp4a.40.2",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const customCache = new CodecSupportManager([
      {
        mimeType: "audio/mp4",
        codec: "mp4a.40.2",
        supported: false,
        supportedIfEncrypted: false,
      },
    ]);
    const spyCodecCache = vi.spyOn(customCache, "isSupported");
    const representation = new Representation(args, "audio", customCache);
    expect(representation.id).toBe("test");
    expect(representation.bitrate).toBe(12);
    expect(representation.index).toBe(minimalIndex);
    expect(representation.codecs).toEqual(["mp4a.40.2"]);
    expect(representation.contentProtections).toBe(undefined);
    expect(representation.frameRate).toBe("1/60");
    expect(representation.height).toBe(undefined);
    expect(representation.mimeType).toBe("audio/mp4");
    expect(representation.width).toBe(undefined);
    expect(representation.getMimeTypeString()).toBe('audio/mp4;codecs="mp4a.40.2"');
    expect(representation.isSupported).toBe(false);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
    expect(spyCodecCache).toHaveBeenCalledWith("audio/mp4", "mp4a.40.2", false);
  });

  it("should not check support for a text media buffer", () => {
    const args = {
      bitrate: 12,
      id: "test",
      frameRate: "1/60",
      mimeType: "bip",
      codecs: "boop",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "text", cache);
    expect(representation.codecs).toEqual(["boop"]);
    expect(representation.mimeType).toBe("bip");
    expect(representation.getMimeTypeString()).toBe('bip;codecs="boop"');
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(0);
  });

  it("should not set isSupported if support prober returns undefined", () => {
    const args = {
      bitrate: 12,
      id: "test",
      frameRate: "1/60",
      mimeType: "bip",
      codecs: "boop",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "audio", cache);
    expect(representation.codecs).toEqual(["boop"]);
    expect(representation.mimeType).toBe("bip");
    expect(representation.getMimeTypeString()).toBe('bip;codecs="boop"');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });

  it("should have both supplementalCodecs and codecs if support prober returns undefined", () => {
    const args = {
      bitrate: 12,
      id: "test",
      frameRate: "1/60",
      mimeType: "bip",
      codecs: "boop",
      supplementalCodecs: "bap",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi.spyOn(cache, "isSupported");
    const representation = new Representation(args, "audio", cache);
    expect(representation.codecs).toEqual(["bap", "boop"]);
    expect(representation.mimeType).toBe("bip");
    expect(representation.getMimeTypeString()).toBe('bip;codecs="bap"');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });

  it("should only have codecs if support prober returns false for the supplementalCodecs and true for the codecs", () => {
    const spyCodecCache = vi
      .spyOn(cache, "isSupported")
      .mockImplementation((_mimeType: string, codec: string, _encrypted: boolean) => {
        return codec === "boop";
      });

    const args = {
      bitrate: 12,
      id: "test",
      frameRate: "1/60",
      mimeType: "bip",
      codecs: "boop",
      supplementalCodecs: "bap",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const representation = new Representation(args, "audio", cache);
    expect(representation.codecs).toEqual(["boop"]);
    expect(representation.mimeType).toBe("bip");
    expect(representation.getMimeTypeString()).toBe('bip;codecs="boop"');
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalled();
  });

  it("should have both supplementalCodecs and codecs if support prober returns undefined for the former and true for the latter", () => {
    const spyCodecCache = vi
      .spyOn(cache, "isSupported")
      .mockImplementation((_mimeType: string, codec: string, _encrypted: boolean) => {
        return codec === "boop" ? true : undefined;
      });

    const args = {
      bitrate: 12,
      id: "test",
      frameRate: "1/60",
      mimeType: "bip",
      codecs: "boop",
      supplementalCodecs: "bap",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const representation = new Representation(args, "audio", cache);
    expect(representation.codecs).toEqual(["bap", "boop"]);
    expect(representation.mimeType).toBe("bip");
    expect(representation.getMimeTypeString()).toBe('bip;codecs="bap"');
    expect(representation.isSupported).toBe(undefined);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalled();
  });

  it("should only have supplementalCodecs if support prober returns true for the former", () => {
    const args = {
      bitrate: 12,
      id: "test",
      frameRate: "1/60",
      mimeType: "bip",
      codecs: "boop",
      supplementalCodecs: "bap",
      index: minimalIndex,
    } as unknown as IParsedRepresentation;
    const spyCodecCache = vi
      .spyOn(cache, "isSupported")
      .mockImplementation((_mimeType: string, codec: string, _encrypted: boolean) => {
        return codec === "bap" ? true : undefined;
      });
    const representation = new Representation(args, "audio", cache);
    expect(representation.codecs).toEqual(["bap"]);
    expect(representation.mimeType).toBe("bip");
    expect(representation.getMimeTypeString()).toBe('bip;codecs="bap"');
    expect(representation.isSupported).toBe(true);
    expect(representation.decipherable).toBe(undefined);
    expect(spyCodecCache).toHaveBeenCalledTimes(1);
  });
});
