import { isSafariDesktop, isSafariMobile } from "./browser_detection";

/**
 * Some platforms have an issue where it seems that no "encrypted" event is sent
 * once a `MediaKeys` instance is attached to the HTMLMediaElement that should
 * send them.
 *
 * This does not correspond to the EME recommendation and risk to break the
 * RxPlayer's logic if no special consideration is taken.
 *
 * @returns {boolean}
 */
export default function shouldWaitForEncryptedBeforeAttachment() : boolean {
  return isSafariDesktop || isSafariMobile;
}
