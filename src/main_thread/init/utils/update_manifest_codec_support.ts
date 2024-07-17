import { MediaError } from "../../../errors";
import type { IManifestMetadata } from "../../../manifest";
import type CodecSupportManager from "../../../manifest/classes/codecSupportList";
import type { ICodecSupport } from "../../../manifest/classes/codecSupportList";
import type { ITrackType } from "../../../public_types";

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
