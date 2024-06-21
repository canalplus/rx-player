import areCodecsCompatible from "../utils/are_codecs_compatible";
import type { ICodecSupportProber } from "./types";

/**
 * Maximum size the `WorkerCodecSupportProber`'s inner cache can be.
 */
const MAX_CODEC_CACHE_SIZE = 50;

/**
 * Class allowing to check for mimeType + codec support in a WebWorker
 * environment where MSE API are not available.
 * @class {WorkerCodecSupportProber}
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

  constructor() {
    this._currentCacheSize = 0;
    this._cachedCodecSupport = new Map();
  }

  /**
   * Probe for the support of the given mime-type and codec combination.
   *
   * Only returns a boolean if the support was added to this
   * `WorkerCodecSupportProber`'s cache (through the `updateCache` method).
   * @param {string} mimeType
   * @param {string} codec
   * @returns {boolean|undefined}
   */
  public isSupported(mimeType: string, codec: string): boolean | undefined {
    const knownSupport = this._cachedCodecSupport.get(mimeType)?.get(codec);
    if (knownSupport !== undefined) {
      return knownSupport;
    }

    return this.isCodecCompatibleWithASupportedCodec(mimeType, codec);
    // TO DO: return early undefined if EME not initialized.
    return undefined;
  }

  private isCodecCompatibleWithASupportedCodec(mimeType: string, codec: string): boolean {
    const inputCodec = `${mimeType};codecs="${codec}"`;

    // Testing all codecs with the CDM is not possible, so there can be codec with
    // specific profiles that are untests. To simplify we only check if a codec within
    // the same codec family is supported.
    // Ex: "avc1.4d401e" should be marked as supported if "avc1.42e01e" is supported as
    // both are avc1 codecs.

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
   * Add an entry into the `WorkerCodecSupportProber`'s cache, so that it can
   * synchronously determine, through the `isSupported` method, whether a codec
   * and mimetype combination is currently supported.
   * @param {string} mimeType
   * @param {string} codec
   * @param {boolean} isSupported
   */
  public updateCache(mimeType: string, codec: string, isSupported: boolean): void {
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
