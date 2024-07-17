import isCodecSupported from "../../../compat/is_codec_supported";
import { MediaError } from "../../../errors";
import type { IManifestMetadata } from "../../../manifest";
import type { ICodecSupportInfo } from "../../../multithread_types";
import type { ITrackType } from "../../../public_types";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import type ContentDecryptor from "../../decrypt";
import { ContentDecryptorState } from "../../decrypt";

/**
 * Returns a list of all codecs that the support is not known yet on the given
 * Manifest.
 * If a representation with (`isSupported`) is undefined, we consider the
 * codec support as unknown.
 *
 * This function iterates through all periods, adaptations, and representations,
 * and collects unknown codecs.
 *
 * @returns {Array} The list of codecs with unknown support status.
 */
export function getCodecsWithUnknownSupport(
  manifest: IManifestMetadata,
): Array<{ mimeType: string; codec: string }> {
  const codecsWithUnknownSupport: Array<{ mimeType: string; codec: string }> = [];
  for (const period of manifest.periods) {
    const checkedAdaptations = [
      ...(period.adaptations.video ?? []),
      ...(period.adaptations.audio ?? []),
    ];
    for (const adaptation of checkedAdaptations) {
      for (const representation of adaptation.representations) {
        if (representation.isSupported === undefined) {
          codecsWithUnknownSupport.push({
            mimeType: representation.mimeType ?? "",
            codec: representation.codecs?.[0] ?? "",
          });
        }
      }
    }
  }
  return codecsWithUnknownSupport;
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
 * @param {Object|null} contentDecryptor
 * @returns {boolean}
 */
export function updateManifestCodecSupport(
  manifest: IManifestMetadata,
  contentDecryptor: ContentDecryptor | null,
): ICodecSupportInfo[] {
  const codecSupportMap: Map<
    string,
    {
      isSupportedClear: boolean;
      isSupportedEncrypted: boolean | undefined;
    }
  > = new Map();
  const updatedCodecs: ICodecSupportInfo[] = [];

  const efficientlyGetCodecSupport = (
    mimeType: string | undefined,
    codec: string | undefined,
  ): {
    isSupportedClear: boolean;
    isSupportedEncrypted: boolean | undefined;
  } => {
    const inputCodec = `${mimeType ?? ""};codecs="${codec ?? ""}"`;
    const baseData = codecSupportMap.get(inputCodec);
    if (baseData !== undefined) {
      return baseData;
    }

    let newData;
    const isSupported = isCodecSupported(inputCodec);
    if (!isSupported) {
      newData = {
        isSupportedClear: false,
        isSupportedEncrypted: false,
      };
    } else if (isNullOrUndefined(contentDecryptor)) {
      newData = {
        isSupportedClear: true,
        // This is ambiguous. Less assume that with no ContentDecryptor, an
        // encrypted codec is supported
        isSupportedEncrypted: true,
      };
    } else if (contentDecryptor.getState() === ContentDecryptorState.Initializing) {
      newData = {
        isSupportedClear: true,
        isSupportedEncrypted: undefined,
      };
    } else {
      newData = {
        isSupportedClear: true,
        isSupportedEncrypted:
          contentDecryptor.isCodecSupported(mimeType ?? "", codec ?? "") ?? true,
      };
    }
    codecSupportMap.set(inputCodec, newData);
    updatedCodecs.push({
      codec: codec ?? "",
      mimeType: mimeType ?? "",
      supported: newData.isSupportedClear,
      supportedIfEncrypted: newData.isSupportedEncrypted,
    });
    return newData;
  };

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
          const codecSupportInfo = efficientlyGetCodecSupport(mimeType, codec);
          if (!isEncrypted) {
            r.isSupported = codecSupportInfo.isSupportedClear;
          } else if (r.isSupported !== codecSupportInfo.isSupportedEncrypted) {
            r.isSupported = codecSupportInfo.isSupportedEncrypted;
          }

          if (r.isSupported === true) {
            r.codecs = [codec];
          } else if (r.isSupported === undefined) {
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
  return updatedCodecs;
}
