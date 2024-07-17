import { describe, expect, it, vi } from "vitest";
import type {
  IManifestMetadata,
  IPeriodMetadata,
  IAdaptationMetadata,
  IRepresentationMetadata,
} from "../../../../manifest";
import { ManifestMetadataFormat } from "../../../../manifest";
import CodecSupportManager from "../../../../manifest/classes/codecSupportList";
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

    const cache = new CodecSupportManager([
      {
        mimeType: "video/mp4",
        codec: "avc1.4d401e",
        supported: true,
        supportedIfEncrypted: true,
      },
      {
        mimeType: "video/mp4",
        codec: "hvc1.2.4.L153.B0",
        supported: true,
        supportedIfEncrypted: false,
      },
    ]);
    updateManifestCodecSupport(manifest, cache);
    expect(representationAVC.isSupported).toBe(true);
    expect(representationHEVC.isSupported).toBe(true);
    expect(representationVP9.isSupported).toBe(undefined);
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

    const cache = new CodecSupportManager([
      {
        mimeType: "video/mp4",
        codec: "avc1.4d401e",
        supported: true,
        supportedIfEncrypted: true,
      },
      {
        mimeType: "video/mp4",
        codec: "hvc1.2.4.L153.B0",
        supported: true,
        supportedIfEncrypted: false,
      },
    ]);
    updateManifestCodecSupport(manifest, cache);
    expect(encryptedRepresentationAVC.isSupported).toBe(true);
    expect(encryptedRepresentationHEVC.isSupported).toBe(false);
  });
});
