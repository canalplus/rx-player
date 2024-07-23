"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
function shouldCallGenerateRequestBeforeBufferingMedia(keySystem) {
    if (keySystem.indexOf("playready") !== -1) {
        return true;
    }
    return false;
}
exports.default = shouldCallGenerateRequestBeforeBufferingMedia;
