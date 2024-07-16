import isCodecSupported from "../../../compat/is_codec_supported";
import { MediaError } from "../../../errors";
import type { ICodecSupportList, IManifestMetadata } from "../../../manifest";
import type CodecSupportManager from "../../../manifest/classes/codecSupportList";
import type { ICodecSupport } from "../../../manifest/classes/codecSupportList";
import type { ITrackType } from "../../../public_types";
import { isCompatibleCodecSupported } from "../../../utils/are_codecs_compatible";

export function getAllUnknownCodecs(manifest: IManifestMetadata) {
  const unknownCodecs: ICodecSupport[] = [];
  for (const period of manifest.periods) {
    const audioAndVideoAdaptations = [
      ...(period.adaptations.video ?? []),
      ...(period.adaptations.audio ?? []),
    ];
    for (const adaptation of audioAndVideoAdaptations) {
      for (const representation of adaptation.representations) {
        if (representation.codecs === undefined) {
          break;
        }
        if (representation.isSupported === undefined) {
          for (const codec of representation.codecs) {
            unknownCodecs.push({
              mimeType: representation.mimeType ?? "",
              codec,
              supported: representation.isSupported,
              supportedIfEncrypted: representation.isSupported,
            });
          }
        }
      }
    }
  }
  return unknownCodecs;
}

/**
 * Evaluates a list of codecs to determine their support status.
 *
 * @param {Array} codecsToCheck - The list of codecs to check.
 * @returns {Array} - The list of evaluated codecs with their support status updated.
 */
export function checkCodecs(
  codecsToCheck: ICodecSupport[],
  codecFromCDM: ICodecSupportList | undefined,
): ICodecSupport[] {
  const evaluatedCodecs: ICodecSupport[] = codecsToCheck.map((codecToCheck) => {
    const inputCodec = `${codecToCheck.mimeType};codecs="${codecToCheck.codec}"`;
    const isSupported = isCodecSupported(inputCodec);
    codecToCheck.supported = isSupported;
    if (!isSupported) {
      return {
        mimeType: codecToCheck.mimeType,
        codec: codecToCheck.codec,
        supported: false,
        supportedIfEncrypted: false,
      };
    }
    const supportedIfEncrypted = isCodecSupportedForCDM(
      codecToCheck.mimeType,
      codecToCheck.codec,
      codecFromCDM,
    );
    return {
      mimeType: codecToCheck.mimeType,
      codec: codecToCheck.codec,
      supported: isSupported,
      supportedIfEncrypted,
    };
  });
  return evaluatedCodecs;
}

/**
 * Checks if a codec is supported for the Content Decryption Module (CDM).
 *
 * @param {string} mimeType - The MIME type to check.
 * @param {string} codec - The codec to check.
 * @returns {boolean | undefined} - True if the codec is supported, false if it is not supported,
 * or undefined if there is no information about the support.
 */
function isCodecSupportedForCDM(
  mimeType: string,
  codec: string,
  codecFromCDM: ICodecSupportList | undefined,
): boolean | undefined {
  if (codecFromCDM === undefined) {
    // the codecs were not received yet from the contentDecryptor
    return undefined;
  }
  const supportedCodecs = codecFromCDM;
  const isSupported = isCompatibleCodecSupported(mimeType, codec, supportedCodecs);
  if (isSupported === undefined) {
    // No information is available regarding the support status.
    // Defaulting to assume the codec is supported.
    return true;
  }
  return isSupported;
}

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
  cachedCodecSupport: CodecSupportManager,
): void {
  manifest.periods.forEach((p) => {
    [
      ...(p.adaptations.audio ?? []),
      ...(p.adaptations.video ?? []),
      ...(p.adaptations.text ?? []),
    ].forEach((a) => {
      let adaptationHasSupportedRepresentation: boolean;
      let adaptationHasUnknownRepresentation: boolean;
      a.representations.forEach((r) => {
        if (r.isSupported !== undefined) {
          if (!adaptationHasSupportedRepresentation && r.isSupported) {
            adaptationHasSupportedRepresentation = true;
          }
          return;
        }
        const isEncrypted = r.contentProtections !== undefined;
        let isRepresentationSupported: boolean | undefined;
        const mimeType = r.mimeType ?? "";
        let codecs = r.codecs ?? [];
        if (codecs.length === 0) {
          codecs = [""];
        }
        let representationHasUnknownCodecs = false;
        for (const codec of codecs) {
          isRepresentationSupported = cachedCodecSupport.isSupported(
            mimeType,
            codec,
            isEncrypted,
          );
          if (isRepresentationSupported === true) {
            r.codecs = [codec];
            break;
          }
          if (isRepresentationSupported === undefined) {
            representationHasUnknownCodecs = true;
          }
        }
        if (isRepresentationSupported === true) {
          /** There is a codec that is supported, the representation is supported */
          r.isSupported = true;
          adaptationHasSupportedRepresentation = true;
        } else {
          if (representationHasUnknownCodecs) {
            /**
             * There are codecs for which support is not yet determined.
             * Therefore, it cannot be confirmed that the representation is unsupported.
             */
            r.isSupported = undefined;
            adaptationHasUnknownRepresentation = true;
          } else {
            /**
             * There are no codecs supported. The representation is unsupported.
             */
            r.isSupported = false;
          }
        }

        if (adaptationHasSupportedRepresentation) {
          /** There is a representation that is supported, the adapatation is supported */
          a.isSupported = true;
        } else {
          if (adaptationHasUnknownRepresentation) {
            /**
             * There are representations with codecs for which support is not yet determined.
             * Therefore, it cannot be confirmed that the adaptation is unsupported.
             * */
            a.isSupported = undefined;
          } else {
            /**
             * There are no representations supported. The adaptation is unsupported.
             */
            a.isSupported = false;
          }
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
}
