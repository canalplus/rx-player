"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var errors_1 = require("../../../errors");
var features_1 = require("../../../features");
var log_1 = require("../../../log");
var reference_1 = require("../../../utils/reference");
var task_canceller_1 = require("../../../utils/task_canceller");
var decrypt_1 = require("../../decrypt");
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
function initializeContentDecryption(mediaElement, keySystems, protectionRef, callbacks, cancelSignal) {
    if (keySystems.length === 0) {
        return createEmeDisabledReference("No `keySystems` option given.");
    }
    else if (features_1.default.decrypt === null) {
        return createEmeDisabledReference("EME feature not activated.");
    }
    var decryptorCanceller = new task_canceller_1.default();
    decryptorCanceller.linkToSignal(cancelSignal);
    var drmStatusRef = new reference_1.default({
        initializationState: { type: "uninitialized", value: null },
        drmSystemId: undefined,
    }, cancelSignal);
    var ContentDecryptor = features_1.default.decrypt;
    if (!ContentDecryptor.hasEmeApis()) {
        return createEmeDisabledReference("EME API not available on the current page.");
    }
    log_1.default.debug("Init: Creating ContentDecryptor");
    var contentDecryptor = new ContentDecryptor(mediaElement, keySystems);
    contentDecryptor.addEventListener("stateChange", function (state) {
        if (state === decrypt_1.ContentDecryptorState.WaitingForAttachment) {
            var isMediaLinked = new reference_1.default(false);
            isMediaLinked.onUpdate(function (isAttached, stopListening) {
                if (isAttached) {
                    stopListening();
                    if (state === decrypt_1.ContentDecryptorState.WaitingForAttachment) {
                        contentDecryptor.attach();
                    }
                }
            }, { clearSignal: decryptorCanceller.signal });
            drmStatusRef.setValue({
                initializationState: {
                    type: "awaiting-media-link",
                    value: { isMediaLinked: isMediaLinked },
                },
                drmSystemId: contentDecryptor.systemId,
            });
        }
        else if (state === decrypt_1.ContentDecryptorState.ReadyForContent) {
            drmStatusRef.setValue({
                initializationState: { type: "initialized", value: null },
                drmSystemId: contentDecryptor.systemId,
            });
            contentDecryptor.removeEventListener("stateChange");
        }
    });
    contentDecryptor.addEventListener("error", function (error) {
        decryptorCanceller.cancel();
        callbacks.onError(error);
    });
    contentDecryptor.addEventListener("warning", function (error) {
        callbacks.onWarning(error);
    });
    contentDecryptor.addEventListener("blackListProtectionData", function (x) {
        callbacks.onBlackListProtectionData(x);
    });
    contentDecryptor.addEventListener("keyIdsCompatibilityUpdate", function (x) {
        callbacks.onKeyIdsCompatibilityUpdate(x);
    });
    protectionRef.onUpdate(function (data) {
        if (data === null) {
            return;
        }
        contentDecryptor.onInitializationData(data);
    }, { clearSignal: decryptorCanceller.signal });
    decryptorCanceller.signal.register(function () {
        contentDecryptor.dispose();
    });
    return drmStatusRef;
    function createEmeDisabledReference(errMsg) {
        protectionRef.onUpdate(function (data, stopListening) {
            if (data === null) {
                // initial value
                return;
            }
            stopListening();
            var err = new errors_1.EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", errMsg);
            callbacks.onError(err);
        }, { clearSignal: cancelSignal });
        var ref = new reference_1.default({
            initializationState: { type: "initialized", value: null },
            drmSystemId: undefined,
        });
        ref.finish(); // We know that no new value will be triggered
        return ref;
    }
}
exports.default = initializeContentDecryption;
