import type { IMediaSourceClass } from "../../../compat/browser_compatibility_types.ts";
import isCodecSupported from "../../../compat/is_codec_supported.ts";
import type Manifest from "../../../manifest/classes/index.ts";
import type { IManifestMetadata } from "../../../manifest/index.ts";
import isNullOrUndefined from "../../../utils/is_null_or_undefined.ts";
import type ContentDecryptor from "../../decrypt/index.ts";
import { ContentDecryptorState } from "../../decrypt/index.ts";
import type { ICodecSupportInfo } from "../../types.ts";

/**
 * Returns a list of all codecs that the support is not known yet on the given
 * Manifest.
 * If a representation with (`isCodecSupported`) is undefined, we consider the
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
        if (representation.isCodecSupported === undefined) {
          for (const codec of representation.baseCodecs ?? []) {
            codecsWithUnknownSupport.push({
              mimeType: representation.mimeType ?? "",
              codec,
            });
          }
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
 * @param {Object|Function|null|undefined} mediaSourceClass - The `MediaSource`
 * class that is intended to be used to play the content.
 * @param {Object} manifest - The manifest to update
 * @param {Object|null} contentDecryptor - The current content decryptor
 * @param {boolean} isPlayingWithMSEinWorker - True if WebWorker is used with MSE in worker
 * @returns {Array.<Object>}
 */
export function updateManifestCodecSupport(
  mediaSourceClass: IMediaSourceClass,
  manifest: IManifestMetadata,
  contentDecryptor: ContentDecryptor | null,
  isPlayingWithMSEinWorker: boolean,
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
    const isSupported = isCodecSupported(mediaSourceClass, inputCodec);
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
        if (
          representation.isCodecSupportedInWebWorker === false &&
          isPlayingWithMSEinWorker
        ) {
          representation.isCodecSupported = false;
          return;
        }

        if (representation.isCodecSupported !== undefined) {
          if (representation.isCodecSupported) {
            hasSupportedCodec = true;
          }
          // We already knew the support for that one, continue to next one
          return;
        }

        const isEncrypted = representation.contentProtections !== undefined;
        const mimeType = representation.mimeType ?? "";
        let codecs = representation.baseCodecs ?? [];
        if (codecs.length === 0) {
          codecs = [""];
        }
        for (const codec of codecs) {
          const codecSupportInfo = efficientlyGetCodecSupport(mimeType, codec);
          if (!isEncrypted) {
            representation.isCodecSupported = codecSupportInfo.isSupportedClear;
          } else if (
            representation.isCodecSupported !== codecSupportInfo.isSupportedEncrypted
          ) {
            representation.isCodecSupported = codecSupportInfo.isSupportedEncrypted;
          }

          if (representation.isCodecSupported === undefined) {
            hasCodecWithUndefinedSupport = true;
          } else if (representation.isCodecSupported) {
            hasSupportedCodec = true;
            representation.chosenCodec = codec; // we found the first compatible codec

            // Don't test subsequent codecs for that Representation
            break;
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
  });
  return updatedCodecs;
}
