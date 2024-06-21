import { describe, expect, it, vi } from "vitest";
import type {
  IManifestMetadata,
  IPeriodMetadata,
  IAdaptationMetadata,
  IRepresentationMetadata,
} from "../../../../manifest";
import { ManifestMetadataFormat } from "../../../../manifest";
import type { IContentProtections } from "../../../../parsers/manifest";
import { updateManifestCodecSupport } from "../update_manifest_codec_support";

function generateFakeManifestWithRepresentations(
  representations: IRepresentationMetadata[],
): IManifestMetadata {
  const videoAdaptation: IAdaptationMetadata = {
    id: "adaptation1",
    representations,
    type: "video",
  };

  const period: IPeriodMetadata = {
    adaptations: {
      video: [videoAdaptation],
    },
    id: "period1",
    start: 0,
    streamEvents: [],
  };

  const manifest: IManifestMetadata = {
    id: "manifest1",
    isDynamic: false,
    isLive: false,
    timeBounds: {
      minimumSafePosition: 0,
      timeshiftDepth: null,
      maximumTimeData: {
        isLinear: false,
        livePosition: 0,
        maximumSafePosition: 10,
        time: 10,
      },
    },
    periods: [period],
    availabilityStartTime: 0,
    isLastPeriodKnown: true,
    manifestFormat: ManifestMetadataFormat.MetadataObject,
    uris: [],
  };

  return manifest;
}

describe("init - utils - updateManifestCodecSupport", () => {
  // create spy
  vi.mock("../../../../compat/is_codec_supported", () => ({
    default: vi.fn((codec: string) => {
      const mockSupportedCodec = [
        'video/mp4;codecs="avc1.4d401e"',
        'video/mp4;codecs="hvc1.2.4.L153.B0"',
      ];
      return mockSupportedCodec.indexOf(codec) !== -1;
    }),
  }));

  vi.mock("../../../../mse/cdm_codec_support_prober.ts", () => ({
    default: {
      isSupported: vi.fn((mimeType: string, codec: string) => {
        const mockSupportedCodecByCDM = [
          'video/mp4;codecs="avc1.4d401e"',
          /** Notice that hvc1.2.4.L153.B0 is not in the codecs supported by the CDM */
        ];
        const fullCodecString = `${mimeType};codecs="${codec}"`;
        return mockSupportedCodecByCDM.indexOf(fullCodecString) !== -1;
      }),
    },
  }));

  it("should return the codecs with result true/false if it's supported by the device", () => {
    const representationAVC: IRepresentationMetadata = {
      bitrate: 1000,
      id: "representation1",
      uniqueId: "representation1",
      codecs: ["avc1.4d401e"],
      mimeType: "video/mp4",
    };

    const representationHEVC: IRepresentationMetadata = {
      bitrate: 2000,
      id: "representation2",
      uniqueId: "representation2",
      codecs: ["hvc1.2.4.L153.B0"],
      mimeType: "video/mp4",
    };

    const representationVP9: IRepresentationMetadata = {
      bitrate: 3000,
      id: "representation3",
      uniqueId: "representation3",
      codecs: ["vp9"],
      mimeType: "video/mp4",
    };

    const manifest = generateFakeManifestWithRepresentations([
      representationAVC,
      representationHEVC,
      representationVP9,
    ]);

    const result = updateManifestCodecSupport(manifest);
    expect(representationAVC.isSupported).toBe(true);
    expect(representationHEVC.isSupported).toBe(true);
    expect(result).toStrictEqual([
      {
        codec: "avc1.4d401e",
        mimeType: "video/mp4",
        result: true, // avc is supported by MSE
      },
      {
        codec: "hvc1.2.4.L153.B0",
        mimeType: "video/mp4",
        result: true, // hevc is supported by MSE
      },
      {
        codec: "vp9",
        mimeType: "video/mp4",
        result: false, // VP9 is not supported by MSE
      },
    ]);
  });

  it("should take into consideration the supported codecs by the CDM", () => {
    /**
     * While HEVC codec is supported by the browser, in this example the CDM
     * does not support it. Overral the codec should be considered as unsupported.
     */
    const fakeContentProtection: IContentProtections = {
      keyIds: [{ keyId: new Uint8Array([1, 2, 3]) }],
      initData: [],
    };
    const encryptedRepresentationAVC: IRepresentationMetadata = {
      bitrate: 1000,
      id: "representation1",
      uniqueId: "representation1",
      codecs: ["avc1.4d401e"],
      mimeType: "video/mp4",
      contentProtections: fakeContentProtection,
    };

    const encryptedRepresentationHEVC: IRepresentationMetadata = {
      bitrate: 2000,
      id: "representation2",
      uniqueId: "representation2",
      codecs: ["hvc1.2.4.L153.B0"],
      mimeType: "video/mp4",
      contentProtections: fakeContentProtection,
    };
    const manifest = generateFakeManifestWithRepresentations([
      encryptedRepresentationAVC,
      encryptedRepresentationHEVC,
    ]);

    const result = updateManifestCodecSupport(manifest);
    expect(encryptedRepresentationAVC.isSupported).toBe(true);
    expect(encryptedRepresentationHEVC.isSupported).toBe(false);
    expect(result).toStrictEqual([
      {
        codec: "avc1.4d401e",
        mimeType: "video/mp4",
        result: true, // avc is supported by MSE
      },
      {
        codec: "hvc1.2.4.L153.B0",
        mimeType: "video/mp4",
        result: true, // hevc is supported by MSE
      },
    ]);
  });
});
