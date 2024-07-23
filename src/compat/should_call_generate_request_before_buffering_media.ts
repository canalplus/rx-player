/**
 * (2024-07-23) We noticed issues with most devices relying on PlayReady when
 * playing some contents with a mix of encrypted and clear segments (not with
 * Canal+ own contents weirdly enough, yet with multiple others both encoded
 * and packaged differently).
 * The issue fixed itself when we called the
 * `MediaKeySession.prototype.generateRequest` EME API **BEFORE** any segment
 * was buffered.
 *
 * So this function returns `true` when calling `generateRequest` should
 * probably be performed before buffering any segment.
 *
 * @param {string} keySystem - The key system in use.
 * @returns {boolean}
 */
export default function shouldCallGenerateRequestBeforeBufferingMedia(
  keySystem: string,
): boolean {
  if (keySystem.indexOf("playready") !== -1) {
    return true;
  }
  return false;
}
