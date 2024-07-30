import { closeSession } from "../../../compat/eme";
import type { ICustomMediaKeys } from "../../../compat/eme";
import {
  DUMMY_PLAY_READY_HEADER,
  generatePlayReadyInitData,
} from "../../../compat/generate_init_data";
import log from "../../../log";

/**
 * The EME API is badly implemented on many devices, leading us toward the need
 * to perform some heavy work-arounds.
 *
 * A frequent one is to call the `MediaKeySession.prototype.generateRequest` API
 * at some point for dummy data an see if it fails (or not, sometimes just
 * calling it is important).
 *
 * This method does just that, resolving the returned Promise if the
 * `generateRequest` call could be performed and succeeded or rejecting in other
 * cases.
 * @param {MediaKeys} mediaKeys
 * @returns {Promise}
 */
export default async function performFakeGenerateRequest(
  mediaKeys: MediaKeys | ICustomMediaKeys,
): Promise<void> {
  const session = mediaKeys.createSession();
  const initData = generatePlayReadyInitData(DUMMY_PLAY_READY_HEADER);
  await session.generateRequest("cenc", initData);
  const session2 = mediaKeys.createSession();
  await session2.generateRequest("cenc", initData);
  const session3 = mediaKeys.createSession();
  await session3.generateRequest("cenc", initData);
  closeSession(session).catch((err) => {
    const error = err instanceof Error ? err : new Error("Unknown Error");
    log.warn("DRM: unable to close fake MediaKeySession", error);
  });
}
