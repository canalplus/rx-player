import isCodecSupported from "../../../compat/is_codec_supported";
import { MediaError } from "../../../errors";
import type { ICodecSupportList, IManifestMetadata } from "../../../manifest";
import cdmCodecSupportProber from "../../../mse/cdm_codec_support_prober";
import type { ITrackType } from "../../../public_types";
/**
 * Ensure that all `Representation` and `Adaptation` have a known status
 * for their codec support and probe it for cases where that's not the
 * case.
 *
 * Because probing for codec support is always synchronous in the main thread,
 * calling this function ensures that support is now known.
 *
 * @param {Object} manifest
 */
export function updateManifestCodecSupport(
  manifest: IManifestMetadata,
): ICodecSupportList {
  const codecSupportList: ICodecSupportList = [];
  const codecSupportedByMseMap: Map<string, Map<string, boolean>> = new Map();
  const codecSupportedByCdmMap: Map<string, Map<string, boolean>> = new Map();

  manifest.periods.forEach((p) => {
    [
      ...(p.adaptations.audio ?? []),
      ...(p.adaptations.video ?? []),
      ...(p.adaptations.text ?? []),
    ].forEach((a) => {
      let hasSupportedCodecs = false;
      a.representations.forEach((r) => {
        const isEncrypted = r.contentProtections !== undefined;
        if (r.isSupported !== undefined) {
          if (!hasSupportedCodecs && r.isSupported) {
            hasSupportedCodecs = true;
          }
          return;
        }
        let isSupported = false;
        const mimeType = r.mimeType ?? "";
        let codecs = r.codecs ?? [];
        if (codecs.length === 0) {
          codecs = [""];
        }
        for (const codec of codecs) {
          const isSupportedByMSE = isCodecSupportedByMSE(mimeType, codec);
          // if MSE supports the codec, and the content is encrypted,
          // check further if the CDM also supports the codec.
          if (isSupportedByMSE.supported && isEncrypted) {
            const isSupportedByCDM = isCodecSupportedByCDM(mimeType, codec);
            isSupported = isSupportedByMSE.supported && isSupportedByCDM;
          } else {
            isSupported = isSupportedByMSE.supported;
          }

          if (!isSupportedByMSE.wasKnown) {
            codecSupportList.push({
              mimeType,
              codec,
              result: isSupportedByMSE.supported,
            });
          }

          if (isSupported) {
            r.codecs = [codec];
            break;
          }
        }

        r.isSupported = isSupported;
        if (r.isSupported) {
          hasSupportedCodecs = true;
        }
        if (!hasSupportedCodecs) {
          if (a.isSupported !== false) {
            a.isSupported = false;
          }
        } else {
          a.isSupported = true;
        }
      });
    });
    ["audio" as const, "video" as const].forEach((ttype: ITrackType) => {
      const forType = p.adaptations[ttype];
      if (forType !== undefined && forType.every((a) => a.isSupported === false)) {
        throw new MediaError(
          "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
          "No supported " + ttype + " adaptations",
          { tracks: undefined },
        );
      }
    });
  });
  return codecSupportList;

  /**
   * Check if the codec is supported by the CDM (the Content Decryption Module).
   * There can be a disparity between what codecs are supported by MSE and the CDM.
   *
   * Ex: Chrome with Widevine is able to create MediaSource for codec HEVC but
   * Widevine L3 is not able to decipher HEVC because it requires hardware DRM.
   * As a result Chrome is not able to play HEVC when it's encrypted, but it can
   * be played if it's unencrypted.
   * @param {string} mimeType - The mimeType of the codec to test.
   * @param {string} codec - The codec to test.
   * @returns { boolean } True if the codec is supported by the CDM.
   */
  function isCodecSupportedByCDM(mimeType: string, codec: string): boolean {
    const knownSupport = codecSupportedByCdmMap.get(mimeType)?.get(codec);
    if (knownSupport !== undefined) {
      return knownSupport;
    }

    const isSupported = cdmCodecSupportProber.isSupported(mimeType, codec);

    const prevCodecMap = codecSupportedByCdmMap.get(mimeType);
    if (prevCodecMap !== undefined) {
      prevCodecMap.set(codec, isSupported);
    } else {
      const codecMap = new Map<string, boolean>();
      codecMap.set(codec, isSupported);
      codecSupportedByCdmMap.set(mimeType, codecMap);
    }
    return isSupported;
  }

  /**
   * Check if the codec is supported by MSE (Media Source Extension).
   * If the codec is supported, the browser should be able to create
   * a media source with the given codec.
   * @param {string} mimeType - The mimeType of the codec to test.
   * @param {string} codec - The codec to test.
   * @returns { boolean } True if the codec is supported by MSE.
   */
  function isCodecSupportedByMSE(
    mimeType: string,
    codec: string,
  ): { supported: boolean; wasKnown: boolean } {
    const knownSupport = codecSupportedByMseMap.get(mimeType)?.get(codec);
    if (knownSupport !== undefined) {
      return { supported: knownSupport, wasKnown: true };
    }

    const mimeTypeStr = `${mimeType};codecs="${codec}"`;
    const isSupported: boolean = isCodecSupported(mimeTypeStr);
    const prevCodecMap = codecSupportedByMseMap.get(mimeType);
    if (prevCodecMap !== undefined) {
      prevCodecMap.set(codec, isSupported);
    } else {
      const codecMap = new Map<string, boolean>();
      codecMap.set(codec, isSupported);
      codecSupportedByMseMap.set(mimeType, codecMap);
    }
    return { supported: isSupported, wasKnown: false };
  }
}
