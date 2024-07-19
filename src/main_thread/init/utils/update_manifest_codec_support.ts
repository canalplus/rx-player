import isCodecSupported from "../../../compat/is_codec_supported";
import { MediaError } from "../../../errors";
import type { IManifestMetadata } from "../../../manifest";
import type Manifest from "../../../manifest/classes";
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
  manifest: Manifest,
): Array<{ mimeType: string; codec: string }>;
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
      if (!adaptation.supportStatus.hasCodecWithUndefinedSupport) {
        continue;
      }
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
    ].forEach((adaptation) => {
      let hasSupportedCodec: boolean = false;
      let hasCodecWithUndefinedSupport: boolean = false;
      adaptation.representations.forEach((representation) => {
        if (representation.isSupported !== undefined) {
          if (representation.isSupported) {
            hasSupportedCodec = true;
          }
          // We already knew the support for that one, continue to next one
          return;
        }

        const isEncrypted = representation.contentProtections !== undefined;
        const mimeType = representation.mimeType ?? "";
        let codecs = representation.codecs ?? [];
        if (codecs.length === 0) {
          codecs = [""];
        }
        for (const codec of codecs) {
          const codecSupportInfo = efficientlyGetCodecSupport(mimeType, codec);
          if (!isEncrypted) {
            representation.isSupported = codecSupportInfo.isSupportedClear;
          } else if (
            representation.isSupported !== codecSupportInfo.isSupportedEncrypted
          ) {
            representation.isSupported = codecSupportInfo.isSupportedEncrypted;
          }

          if (representation.isSupported === undefined) {
            hasCodecWithUndefinedSupport = true;
          } else if (representation.isSupported) {
            hasSupportedCodec = true;
            representation.codecs = [codec];
          }
        }
      });
      adaptation.supportStatus.hasCodecWithUndefinedSupport =
        hasCodecWithUndefinedSupport;
      if (hasCodecWithUndefinedSupport && !hasSupportedCodec) {
        adaptation.supportStatus.hasSupportedCodec = undefined;
      } else {
        adaptation.supportStatus.hasSupportedCodec = hasSupportedCodec;
      }
    });

    ["audio" as const, "video" as const].forEach((ttype: ITrackType) => {
      const forType = p.adaptations[ttype];
      if (
        forType !== undefined &&
        forType.every((a) => a.supportStatus.hasSupportedCodec === false)
      ) {
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
