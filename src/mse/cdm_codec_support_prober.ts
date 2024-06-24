import areCodecsCompatible from "../utils/are_codecs_compatible";
import type { ICodecSupportProber } from "./types";

/**
 * Maximum size the `CdmCodecSupportProber`'s inner cache can be.
 */
const MAX_CODEC_CACHE_SIZE = 50;

/**
 * Class allowing to check that the CDM (Content Decryption Module) supports the
 * mimeType + codec and will be able to decipher such a content.
 * @class {CdmCodecSupportProber}
 */
class CdmCodecSupportProber implements ICodecSupportProber {
  /**
   * Current size of the `_cachedCodecSupport` size.
   * We cannot rely on `_cachedCodecSupport.size` directly as it is a Map of
   * Maps.
   */
  private _currentCacheSize: number;
  /**
   * Small cache keeping the result of codec support checks for the last one
   * requested.
   * The first key is the mime-type, the second is the codec.
   */
  private _cachedCodecSupport: Map<string, Map<string, boolean>>;

  /**
   * Indicates whether the supported codecs have been received.
   *
   * This boolean attribute is used to determine if the initial check for supported codecs
   * has been completed. If false, it means the supported codecs are not known yet.
   */
  private _hasReceivedSupportedCodecs: boolean;

  constructor() {
    this._currentCacheSize = 0;
    this._cachedCodecSupport = new Map();
    this._hasReceivedSupportedCodecs = false;
  }

  /**
   * Determines if a given codec is supported by the CDM (the Content Decryption Module).
   * The support for a given codec can differ from the browser and the CDM.
   * The browser and the CDM both needs to support the codec in order to play an encrypted content.
   * @param {string} mimeType - The MIME type of the codec to check.
   * @param {string} codec - The codec to check.
   * @returns {boolean|undefined}
   */
  public isSupported(mimeType: string, codec: string): boolean {
    if (!this._hasReceivedSupportedCodecs) {
      // The supported codecs are not known yet. Assume it's is supported.
      return true;
    }

    const knownSupport = this._cachedCodecSupport.get(mimeType)?.get(codec);
    if (knownSupport !== undefined) {
      return knownSupport;
    }

    /**
     * Checking codec support for the CDM requires calling the requestMediaKeySystemAccess() API.
     * Frequent calls to this API can lead to performance issues. To mitigate this, we check support
     * for a predefined list of popular codecs only once. Subsequently, we determine if the codec
     * to be tested has the same codec string but a different profile as an already checked codec.
     * If a codec with the same codec string but a different profile is supported, we consider the
     * codec to be supported as well.
     *
     * For example, "avc1.4d401e" should be marked as supported if "avc1.42e01e" is supported,
     * as both are avc1 codecs.
     */
    return this.isCodecCompatibleWithASupportedCodec(mimeType, codec);
  }

  /**
   * Checks if a given codec is compatible with any of the already supported codecs.
   * @param {string} mimeType - The MIME type of the codec to check.
   * @param {string} codec - The codec to check.
   * @returns {boolean} - Returns true if the codec is compatible with an already supported codec.
   */
  private isCodecCompatibleWithASupportedCodec(mimeType: string, codec: string): boolean {
    const inputCodec = `${mimeType};codecs="${codec}"`;
    const codecMap = this._cachedCodecSupport.get(mimeType);
    if (codecMap === undefined) {
      return false;
    }

    for (const [currentCodec, supported] of codecMap.entries()) {
      if (!supported) {
        break;
      }

      const existingCodec = `${mimeType};codecs="${currentCodec}"`;
      if (areCodecsCompatible(inputCodec, existingCodec)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add an entry into the `CdmCodecSupportProber`'s cache, so that it can
   * synchronously determine, through the `isSupported` method, whether a codec
   * and mimetype combination is currently supported.
   * @param {string} mimeType
   * @param {string} codec
   * @param {boolean} isSupported
   */
  public addToCache(mimeType: string, codec: string, isSupported: boolean): void {
    this._hasReceivedSupportedCodecs = true;

    if (this._currentCacheSize >= MAX_CODEC_CACHE_SIZE) {
      // For simplicity, just clear everything here, we don't care that much
      // about implementing a true LRU cache here
      this._cachedCodecSupport.clear();
      this._currentCacheSize = 0;
    }
    const prevCodecMap = this._cachedCodecSupport.get(mimeType);
    if (prevCodecMap !== undefined) {
      prevCodecMap.set(codec, isSupported);
    } else {
      const codecMap = new Map<string, boolean>();
      codecMap.set(codec, isSupported);
      this._cachedCodecSupport.set(mimeType, codecMap);
    }
  }
}

export default new CdmCodecSupportProber();
