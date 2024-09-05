import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import type { IParsedAdaptation, IParsedRepresentation } from "../../../parsers/manifest";
import type {
  IRepresentationContext,
  IRepresentationFilterRepresentation,
} from "../../../public_types";
import type IAdaptation from "../adaptation";
import CodecSupportCache from "../codec_support_cache";
import type { IRepresentationIndex } from "../representation_index";

const minimalRepresentationIndex: IRepresentationIndex = {
  getInitSegment() {
    return null;
  },
  getSegments() {
    return [];
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
  checkDiscontinuity() {
    return null;
  },
  isSegmentStillAvailable(): undefined {
    return;
  },
  canBeOutOfSyncError(): true {
    return true;
  },
  isStillAwaitingFutureSegments() {
    return false;
  },
  isInitialized(): true {
    return true;
  },
  awaitSegmentBetween(): undefined {
    return;
  },
  initialize() {
    /* noop */
  },
  addPredictedSegments() {
    /* noop */
  },
  _replace() {
    /* noop */
  },
  _update() {
    /* noop */
  },
};
const mockDefaultRepresentationImpl = vi.fn((arg: IParsedRepresentation) => {
  return {
    bitrate: arg.bitrate,
    id: arg.id,
    isSupported: true,
    isPlayable() {
      return true;
    },
    index: arg.index,
  };
});

describe("Manifest - Adaptation", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    mockDefaultRepresentationImpl.mockClear();
  });

  it("should be able to create a minimal Adaptation", async () => {
    vi.doMock("../representation", () => ({
      default: mockDefaultRepresentationImpl,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;
    const args: IParsedAdaptation = { id: "12", representations: [], type: "video" };
    const codecSupportCache = new CodecSupportCache([]);
    const adaptation = new Adaptation(args, { codecSupportCache });
    expect(adaptation.id).toBe("12");
    expect(adaptation.representations).toEqual([]);
    expect(adaptation.type).toBe("video");
    expect(adaptation.isAudioDescription).toBe(undefined);
    expect(adaptation.isClosedCaption).toBe(undefined);
    expect(adaptation.language).toBe(undefined);
    expect(adaptation.normalizedLanguage).toBe(undefined);
    expect(adaptation.getRepresentation("")).toBe(undefined);

    expect(mockDefaultRepresentationImpl).not.toHaveBeenCalled();
  });

  it("should normalize a given language", async () => {
    vi.doMock("../representation", () => ({
      default: mockDefaultRepresentationImpl,
    }));
    const mockNormalize = vi.fn((lang: string) => lang + "foo");
    vi.doMock("../../../utils/languages", () => ({
      default: mockNormalize,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;
    const args1: IParsedAdaptation = {
      id: "12",
      representations: [],
      language: "fr",
      type: "video" as const,
    };
    const codecSupportCache = new CodecSupportCache([]);
    const adaptation1 = new Adaptation(args1, { codecSupportCache });
    expect(adaptation1.language).toBe("fr");
    expect(adaptation1.normalizedLanguage).toBe("frfoo");
    expect(mockNormalize).toHaveBeenCalledTimes(1);
    expect(mockNormalize).toHaveBeenCalledWith("fr");
    mockNormalize.mockClear();

    const args2: IParsedAdaptation = {
      id: "12",
      representations: [],
      language: "toto",
      type: "video" as const,
    };
    const adaptation2 = new Adaptation(args2, { codecSupportCache });
    expect(adaptation2.language).toBe("toto");
    expect(adaptation2.normalizedLanguage).toBe("totofoo");
    expect(mockNormalize).toHaveBeenCalledTimes(1);
    expect(mockNormalize).toHaveBeenCalledWith("toto");
  });

  it("should not call normalize if no language is given", async () => {
    vi.doMock("../representation", () => ({
      default: mockDefaultRepresentationImpl,
    }));
    const mockNormalize = vi.fn((lang: string) => lang + "foo");
    vi.doMock("../../../utils/languages", () => ({
      default: mockNormalize,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;
    const args1: IParsedAdaptation = { id: "12", representations: [], type: "video" };
    const codecSupportCache = new CodecSupportCache([]);
    const adaptation1 = new Adaptation(args1, { codecSupportCache });
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("should create and sort the corresponding Representations", async () => {
    vi.doMock("../representation", () => ({
      default: mockDefaultRepresentationImpl,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;
    const rep1 = {
      bitrate: 10,
      id: "rep1",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep2 = {
      bitrate: 30,
      id: "rep2",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep3 = {
      bitrate: 20,
      id: "rep3",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const representations = [rep1, rep2, rep3];
    const args: IParsedAdaptation = { id: "12", representations, type: "text" };

    const codecSupportCache = new CodecSupportCache([]);
    const adaptation = new Adaptation(args, { codecSupportCache });
    const parsedRepresentations = adaptation.representations;
    expect(mockDefaultRepresentationImpl).toHaveBeenCalledTimes(3);
    expect(mockDefaultRepresentationImpl).toHaveBeenNthCalledWith(1, rep1, {
      trackType: "text",
      codecSupportCache,
    });
    expect(mockDefaultRepresentationImpl).toHaveBeenNthCalledWith(2, rep2, {
      trackType: "text",
      codecSupportCache,
    });
    expect(mockDefaultRepresentationImpl).toHaveBeenNthCalledWith(3, rep3, {
      trackType: "text",
      codecSupportCache,
    });

    expect(parsedRepresentations.length).toBe(3);
    expect(parsedRepresentations[0].id).toEqual("rep1");
    expect(parsedRepresentations[1].id).toEqual("rep3");
    expect(parsedRepresentations[2].id).toEqual("rep2");

    expect(adaptation.getRepresentation("rep2")?.bitrate).toEqual(30);
  });

  it("should execute the representationFilter if given", async () => {
    const mockRepresentation = vi.fn((arg: IParsedRepresentation) => {
      return {
        bitrate: arg.bitrate,
        id: arg.id,
        isSupported: arg.id !== "rep4",
        isPlayable() {
          return true;
        },
        index: arg.index,
      };
    });

    vi.doMock("../representation", () => ({
      default: mockRepresentation,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;
    const rep1 = {
      bitrate: 10,
      id: "rep1",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep2 = {
      bitrate: 20,
      id: "rep2",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep3 = {
      bitrate: 30,
      id: "rep3",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep4 = {
      bitrate: 40,
      id: "rep4",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep5 = {
      bitrate: 50,
      id: "rep5",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep6 = {
      bitrate: 60,
      id: "rep6",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const representations = [rep1, rep2, rep3, rep4, rep5, rep6];

    const representationFilter = vi.fn(
      (
        representation: IRepresentationFilterRepresentation,
        adaptationInfos: IRepresentationContext,
      ) => {
        if (
          adaptationInfos.language === "fr" &&
          representation.bitrate !== undefined &&
          representation.bitrate < 40
        ) {
          return false;
        }
        return true;
      },
    );
    const args: IParsedAdaptation = {
      id: "12",
      language: "fr",
      representations,
      type: "text" as const,
    };
    const codecSupportCache = new CodecSupportCache([]);
    const adaptation = new Adaptation(args, { codecSupportCache, representationFilter });

    const parsedRepresentations = adaptation.representations;
    expect(representationFilter).toHaveBeenCalledTimes(6);
    expect(parsedRepresentations.length).toBe(3);

    expect(parsedRepresentations[0].id).toEqual("rep4");
    expect(parsedRepresentations[1].id).toEqual("rep5");
    expect(parsedRepresentations[2].id).toEqual("rep6");

    expect(adaptation.getRepresentation("rep2")).toBe(undefined);
    expect(adaptation.getRepresentation("rep4")?.id).toEqual("rep4");
  });

  it("should set an isDub value if one", async () => {
    vi.doMock("../representation", () => ({
      default: mockDefaultRepresentationImpl,
    }));
    const mockNormalize = vi.fn((lang: string) => lang + "foo");
    vi.doMock("../../../utils/languages", () => ({
      default: mockNormalize,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;

    const args1: IParsedAdaptation = {
      id: "12",
      representations: [],
      isDub: false,
      type: "video",
    };
    const codecSupportCache = new CodecSupportCache([]);
    const adaptation1 = new Adaptation(args1, { codecSupportCache });
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.isDub).toEqual(false);
    expect(mockNormalize).not.toHaveBeenCalled();

    const args2: IParsedAdaptation = {
      id: "12",
      representations: [],
      isDub: true,
      type: "video",
    };
    const adaptation2 = new Adaptation(args2, { codecSupportCache });
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.isDub).toEqual(true);
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("should set an isClosedCaption value if one", async () => {
    vi.doMock("../representation", () => ({
      default: mockDefaultRepresentationImpl,
    }));
    const mockNormalize = vi.fn((lang: string) => lang + "foo");
    vi.doMock("../../../utils/languages", () => ({
      default: mockNormalize,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;

    const args1: IParsedAdaptation = {
      id: "12",
      representations: [],
      closedCaption: false,
      type: "video",
    };
    const codecSupportCache = new CodecSupportCache([]);
    const adaptation1 = new Adaptation(args1, { codecSupportCache });
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.isClosedCaption).toEqual(false);
    expect(mockNormalize).not.toHaveBeenCalled();

    const args2: IParsedAdaptation = {
      id: "12",
      representations: [],
      closedCaption: true,
      type: "video",
    };
    const adaptation2 = new Adaptation(args2, { codecSupportCache });
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.isClosedCaption).toEqual(true);
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("should set an isAudioDescription value if one", async () => {
    vi.doMock("../representation", () => ({
      default: mockDefaultRepresentationImpl,
    }));
    const mockNormalize = vi.fn((lang: string) => lang + "foo");

    vi.doMock("../../../utils/languages", () => ({
      default: mockNormalize,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;

    const args1: IParsedAdaptation = {
      id: "12",
      representations: [],
      audioDescription: false,
      type: "video",
    };
    const codecSupportCache = new CodecSupportCache([]);
    const adaptation1 = new Adaptation(args1, { codecSupportCache });
    expect(adaptation1.language).toBe(undefined);
    expect(adaptation1.normalizedLanguage).toBe(undefined);
    expect(adaptation1.isAudioDescription).toEqual(false);
    expect(mockNormalize).not.toHaveBeenCalled();

    const args2: IParsedAdaptation = {
      id: "12",
      representations: [],
      audioDescription: true,
      type: "video",
    };
    const adaptation2 = new Adaptation(args2, { codecSupportCache });
    expect(adaptation2.language).toBe(undefined);
    expect(adaptation2.normalizedLanguage).toBe(undefined);
    expect(adaptation2.isAudioDescription).toEqual(true);
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("should return the first Representation with the given Id with `getRepresentation`", async () => {
    vi.doMock("../representation", () => ({
      default: mockDefaultRepresentationImpl,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;
    const rep1 = {
      bitrate: 10,
      id: "rep1",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep2 = {
      bitrate: 20,
      id: "rep2",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep3 = {
      bitrate: 30,
      id: "rep2",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const representations = [rep1, rep2, rep3];
    const args: IParsedAdaptation = { id: "12", representations, type: "text" as const };
    const codecSupportCache = new CodecSupportCache([]);
    const adaptation = new Adaptation(args, { codecSupportCache });

    expect(adaptation.getRepresentation("rep1")?.bitrate).toEqual(10);
    expect(adaptation.getRepresentation("rep2")?.bitrate).toEqual(20);
  });

  it("should return undefined in `getRepresentation` if no representation is found with this Id", async () => {
    vi.doMock("../representation", () => ({
      default: mockDefaultRepresentationImpl,
    }));

    const Adaptation = (await vi.importActual("../adaptation"))
      .default as typeof IAdaptation;
    const rep1 = {
      bitrate: 10,
      id: "rep1",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep2 = {
      bitrate: 20,
      id: "rep2",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const rep3 = {
      bitrate: 30,
      id: "rep2",
      cdnMetadata: [],
      index: minimalRepresentationIndex,
    };
    const representations = [rep1, rep2, rep3];
    const args: IParsedAdaptation = { id: "12", representations, type: "text" as const };
    const codecSupportCache = new CodecSupportCache([]);
    const adaptation = new Adaptation(args, { codecSupportCache });

    expect(adaptation.getRepresentation("rep5")).toBe(undefined);
  });
});
