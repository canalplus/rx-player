/**
 * (2024-07-23) We noticed issues with most devices relying on PlayReady when
 * playing some contents with mix encrypted and clear contents (not with
 * Canal+ own contents weirdly enough, yet with multiple other contents
 * encoded/packaged differently).
 *
 * Due to this, we
 * @param {string} keySystem - The key system in use.
 * @returns {boolean}
 */
export default function shouldCallGenerateRequestBeforeBufferingMedia(keySystem: string): boolean;
//# sourceMappingURL=should_call_generate_request_before_buffering_media.d.ts.map