/**
 * Some external tools set that boolean, in which case, we should enable DEBUG
 * logs and various tricks to make as much logs as available to those tools.
 *
 * @returns {boolean}
 */
export default function isDebugModeEnabled() {
    return typeof __RX_PLAYER_DEBUG_MODE__ === "boolean" && __RX_PLAYER_DEBUG_MODE__;
}
