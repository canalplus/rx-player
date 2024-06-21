import type { IMediaElement } from "../../../compat/browser_compatibility_types";
import { EncryptedMediaError } from "../../../errors";
import features from "../../../features";
import log from "../../../log";
import type { IKeySystemOption, IPlayerError } from "../../../public_types";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import SharedReference from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
import type { CancellationSignal } from "../../../utils/task_canceller";
import { ContentDecryptorState } from "../../decrypt";
import type { IContentProtection, IProcessedProtectionData } from "../../decrypt";
import cdmCodecSupportProber from "./../../../mse/cdm_codec_support_prober";

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
export default function initializeContentDecryption(
  mediaElement: IMediaElement,
  keySystems: IKeySystemOption[],
  protectionRef: IReadOnlySharedReference<null | IContentProtection>,
  callbacks: {
    onWarning: (err: IPlayerError) => void;
    onError: (err: Error) => void;
    onBlackListProtectionData: (val: IProcessedProtectionData) => void;
    onKeyIdsCompatibilityUpdate: (updates: {
      whitelistedKeyIds: Uint8Array[];
      blacklistedKeyIds: Uint8Array[];
      delistedKeyIds: Uint8Array[];
    }) => void;
  },
  cancelSignal: CancellationSignal,
): IReadOnlySharedReference<IDrmInitializationStatus> {
  if (keySystems.length === 0) {
    return createEmeDisabledReference("No `keySystems` option given.");
  } else if (features.decrypt === null) {
    return createEmeDisabledReference("EME feature not activated.");
  }

  const decryptorCanceller = new TaskCanceller();
  decryptorCanceller.linkToSignal(cancelSignal);
  const drmStatusRef = new SharedReference<IDrmInitializationStatus>(
    {
      initializationState: { type: "uninitialized", value: null },
      drmSystemId: undefined,
    },
    cancelSignal,
  );

  const ContentDecryptor = features.decrypt;

  if (!ContentDecryptor.hasEmeApis()) {
    return createEmeDisabledReference("EME API not available on the current page.");
  }

  log.debug("Init: Creating ContentDecryptor");
  const contentDecryptor = new ContentDecryptor(mediaElement, keySystems);

  const updateCodecSupportedByCDM = (state: ContentDecryptorState) => {
    if (state > ContentDecryptorState.Initializing) {
      const codecsSupportedByCDM = contentDecryptor.getSupportedCodecs();
      // TO DO: this needs to be re-done if the keySystem changes.
      for (const codec of codecsSupportedByCDM) {
        cdmCodecSupportProber.addToCache(codec.mimeType, codec.codec, codec.result);
      }
      contentDecryptor.removeEventListener("stateChange", updateCodecSupportedByCDM);
    }
  };
  contentDecryptor.addEventListener("stateChange", updateCodecSupportedByCDM);

  contentDecryptor.addEventListener("stateChange", (state) => {
    if (state === ContentDecryptorState.WaitingForAttachment) {
      const isMediaLinked = new SharedReference(false);
      isMediaLinked.onUpdate(
        (isAttached, stopListening) => {
          if (isAttached) {
            stopListening();
            if (state === ContentDecryptorState.WaitingForAttachment) {
              contentDecryptor.attach();
            }
          }
        },
        { clearSignal: decryptorCanceller.signal },
      );
      drmStatusRef.setValue({
        initializationState: {
          type: "awaiting-media-link",
          value: { isMediaLinked },
        },
        drmSystemId: contentDecryptor.systemId,
      });
    } else if (state === ContentDecryptorState.ReadyForContent) {
      drmStatusRef.setValue({
        initializationState: { type: "initialized", value: null },
        drmSystemId: contentDecryptor.systemId,
      });
      contentDecryptor.removeEventListener("stateChange");
    }
  });

  contentDecryptor.addEventListener("error", (error) => {
    decryptorCanceller.cancel();
    callbacks.onError(error);
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

  protectionRef.onUpdate(
    (data) => {
      if (data === null) {
        return;
      }
      contentDecryptor.onInitializationData(data);
    },
    { clearSignal: decryptorCanceller.signal },
  );

  decryptorCanceller.signal.register(() => {
    contentDecryptor.dispose();
  });

  return drmStatusRef;

  function createEmeDisabledReference(errMsg: string) {
    protectionRef.onUpdate(
      (data, stopListening) => {
        if (data === null) {
          // initial value
          return;
        }
        stopListening();
        const err = new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", errMsg);
        callbacks.onError(err);
      },
      { clearSignal: cancelSignal },
    );
    const ref = new SharedReference({
      initializationState: { type: "initialized" as const, value: null },
      drmSystemId: undefined,
    });
    ref.finish(); // We know that no new value will be triggered
    return ref;
  }
}

/** Status of content decryption initialization. */
interface IDrmInitializationStatus {
  /** Current initialization state the decryption logic is in. */
  initializationState: IDecryptionInitializationState;
  /**
   * If set, corresponds to the hex string describing the current key system
   * used.
   * `undefined` if unknown or if it does not apply.
   */
  drmSystemId: string | undefined;
}

/** Initialization steps to add decryption capabilities to an `HTMLMediaElement`. */
type IDecryptionInitializationState =
  /**
   * Decryption capabilities have not been initialized yet.
   * You should wait before performing any action on the concerned
   * `HTMLMediaElement` (such as linking a content / `MediaSource` to it).
   */
  | { type: "uninitialized"; value: null }
  /**
   * The `MediaSource` or media url has to be linked to the `HTMLMediaElement`
   * before continuing.
   * Once it has been linked with success (e.g. the `MediaSource` has "opened"),
   * the `isMediaLinked` `SharedReference` should be set to `true`.
   *
   * In the `MediaSource` case, you should wait until the `"initialized"`
   * state before pushing segment.
   *
   * Note that the `"awaiting-media-link"` is an optional state. It can be
   * skipped to directly `"initialized"` instead.
   */
  | {
      type: "awaiting-media-link";
      value: { isMediaLinked: SharedReference<boolean> };
    }
  /**
   * The `MediaSource` or media url can be linked AND segments can be pushed to
   * the `HTMLMediaElement` on which decryption capabilities were wanted.
   */
  | { type: "initialized"; value: null };
