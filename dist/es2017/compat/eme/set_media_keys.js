import log from "../../log";
import sleep from "../../utils/sleep";
import shouldAwaitSetMediaKeys from "../should_await_set_media_keys";
/**
 * @param {Object} emeImplementation
 * @param {Object} mediaElement
 * @param {Object|null} mediaKeys
 * @returns {Promise}
 */
export function setMediaKeys(emeImplementation, mediaElement, mediaKeys) {
    const prom = emeImplementation
        .setMediaKeys(mediaElement, mediaKeys)
        .then(() => {
        log.info("Compat: MediaKeys updated with success");
    })
        .catch((err) => {
        if (mediaKeys === null) {
            log.error("Compat: Could not reset MediaKeys", err instanceof Error ? err : "Unknown Error");
            return;
        }
        log.error("Compat: Could not update MediaKeys", err instanceof Error ? err : "Unknown Error");
        throw err;
    });
    if (shouldAwaitSetMediaKeys()) {
        return prom;
    }
    return Promise.race([
        prom,
        // Because we know how much EME has implementation issues, let's not block
        // everything because that API hangs
        sleep(1000),
    ]);
}
