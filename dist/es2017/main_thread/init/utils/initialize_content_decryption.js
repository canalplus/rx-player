import { EncryptedMediaError } from "../../../errors";
import features from "../../../features";
import log from "../../../log";
import SharedReference from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
import { ContentDecryptorState } from "../../decrypt";
/**
 * Initialize content decryption capabilities on the given `HTMLMediaElement`.
 *
 * You can call this function even if you don't want decrytpion capabilities, in
 * which case you can just set the `keySystems` option as an empty array.
 * In this situation, the returned object will directly correspond to an
 * "`initialized`" state and the `onError` callback will be triggered as soon
 * as protection information is received.
 *
 * @param {HTMLMediaElement} mediaElement - `HTMLMediaElement` on which content
 * decryption may be wanted.
 * @param {Array.<Object>} keySystems - Key system configuration(s) wanted
 * Empty array if no content decryption capability is wanted.
 * @param {Object} protectionRef - Reference through which content
 * protection initialization data will be sent through.
 * @param {Object} callbacks - Callbacks called at various decryption-related
 * events.
 * @param {Object} cancelSignal - When that signal emits, this function will
 * stop listening to various events as well as items sent through the
 * `protectionRef` parameter.
 * @returns {Object} - Reference emitting the current status regarding DRM
 * initialization.
 */
export default function initializeContentDecryption(mediaElement, keySystems, protectionRef, callbacks, cancelSignal) {
    if (keySystems.length === 0) {
        return createEmeDisabledReference("No `keySystems` option given.");
    }
    else if (features.decrypt === null) {
        return createEmeDisabledReference("EME feature not activated.");
    }
    const decryptorCanceller = new TaskCanceller();
    decryptorCanceller.linkToSignal(cancelSignal);
    const drmStatusRef = new SharedReference({
        type: "uninitialized",
        value: null,
    }, cancelSignal);
    const ContentDecryptor = features.decrypt;
    if (!ContentDecryptor.hasEmeApis()) {
        return createEmeDisabledReference("EME API not available on the current page.");
    }
    log.debug("Init: Creating ContentDecryptor");
    const contentDecryptor = new ContentDecryptor(mediaElement, keySystems);
    contentDecryptor.addEventListener("stateChange", (state) => {
        switch (state.name) {
            case ContentDecryptorState.Error:
                decryptorCanceller.cancel();
                callbacks.onError(state.payload);
                break;
            case ContentDecryptorState.WaitingForAttachment:
                const isMediaLinked = new SharedReference(false);
                isMediaLinked.onUpdate((isAttached, stopListening) => {
                    if (isAttached) {
                        stopListening();
                        if (state.name === ContentDecryptorState.WaitingForAttachment) {
                            contentDecryptor.attach();
                        }
                    }
                }, { clearSignal: decryptorCanceller.signal });
                drmStatusRef.setValue({
                    type: "awaiting-media-link",
                    value: { isMediaLinked },
                });
                break;
            case ContentDecryptorState.ReadyForContent:
                drmStatusRef.setValue({
                    type: "initialized",
                    value: {
                        drmSystemId: state.payload.systemId,
                        canFilterProtectionData: state.payload.canFilterProtectionData,
                        failOnEncryptedAfterClear: state.payload.failOnEncryptedAfterClear,
                    },
                });
                drmStatusRef.finish();
                break;
        }
    });
    contentDecryptor.addEventListener("warning", (error) => {
        callbacks.onWarning(error);
    });
    contentDecryptor.addEventListener("blackListProtectionData", (x) => {
        callbacks.onBlackListProtectionData(x);
    });
    contentDecryptor.addEventListener("keyIdsCompatibilityUpdate", (x) => {
        callbacks.onKeyIdsCompatibilityUpdate(x);
    });
    protectionRef.onUpdate((data) => {
        if (data === null) {
            return;
        }
        contentDecryptor.onInitializationData(data);
    }, { clearSignal: decryptorCanceller.signal });
    decryptorCanceller.signal.register(() => {
        contentDecryptor.dispose();
    });
    return drmStatusRef;
    function createEmeDisabledReference(errMsg) {
        protectionRef.onUpdate((data, stopListening) => {
            if (data === null) {
                // initial value
                return;
            }
            stopListening();
            const err = new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", errMsg);
            callbacks.onError(err);
        }, { clearSignal: cancelSignal });
        const ref = new SharedReference({
            type: "initialized",
            value: {
                drmSystemId: undefined,
                canFilterProtectionData: true,
                failOnEncryptedAfterClear: false,
            },
        });
        ref.finish(); // We know that no new value will be triggered
        return ref;
    }
}
