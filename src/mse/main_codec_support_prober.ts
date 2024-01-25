import isCodecSupported from "../compat/is_codec_supported";
import type { ICodecSupportProber } from "./types";

/**
 * Maximum size the `MainCodecSupportProber`'s inner cache can be.
 */
const MAX_CODEC_CACHE_SIZE = 50;

/**
 * Class allowing to check for mimeType + codec support when MSE API are
 * available in the current environment.
 *
 * In that environment, codec support can always be requested synchronously and
 * is relatively cheap.
 * @class {MainCodecSupportProber}
 */
class MainCodecSupportProber implements ICodecSupportProber {
  /**
   * Small cache keeping the result of codec support checks for the last one
   * requested.
   */
  private _cachedCodecSupport: Map<string, boolean>;

  constructor() {
    this._cachedCodecSupport = new Map();
  }

  /**
   * Probe for the support of the given mime-type and codec combination.
   * @param {string} mimeType
   * @param {string} codec
   * @returns {boolean}
   */
  public isSupported(mimeType: string, codec: string): boolean {
    const mimeTypeStr = `${mimeType ?? ""};codecs="${codec ?? ""}"`;
    const knownSupport = this._cachedCodecSupport.get(mimeTypeStr);
    if (knownSupport !== undefined) {
      return knownSupport;
    }
    if (this._cachedCodecSupport.size >= MAX_CODEC_CACHE_SIZE) {
      // For simplicity, just clear everything here, we don't care that much
      // about implementing a true LRU cache here
      this._cachedCodecSupport.clear();
    }
    const isSupported = isCodecSupported(mimeTypeStr);
    this._cachedCodecSupport.set(mimeTypeStr, isSupported);
    return isSupported;
  }
}

const mainCodecSupportProber = new MainCodecSupportProber();
export default mainCodecSupportProber;
