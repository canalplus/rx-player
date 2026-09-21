import type {
  Representation,
  IRepresentationProtectionData,
} from "../../../manifest/classes/index.ts";
import type { IProtectionDataInfo } from "../../../transports/index.ts";

/**
 * Manages the one-time notification of encryption/DRM data for a Representation.
 *
 * This class collects encryption data from parsed segments and ensures that
 * the encryption notification callback is triggered exactly once, as soon as
 * sufficient data is available.
 *
 * The notification may occur in two ways:
 * 1. **Early notification** (constructor): If the DRM system ID is known and
 *    complete encryption data (with all key IDs) is already available, the
 *    notification is sent immediately to enable faster license negotiation.
 * 2. **Deferred notification** (onNewProtectionData): If early notification
 *    doesn't occur, encryption data is collected from parsed segments and
 *    the notification is sent once any encryption data becomes available.
 *
 * @example
 * const notifier = new EncryptionDataNotifier({
 *   drmSystemId: "edef8ba979d64acea3c827dcd51d21ed",
 *   representation,
 *   notify: (data) => callbacks.encryptionDataEncountered(data),
 * });
 *
 * // Later, when a segment is parsed:
 * notifier.onNewProtectionData(parsedSegmentEvent.protectionData);
 */
export default class EncryptionDataNotifier {
  /**
   * If `true` encryption data has already been sent through this
   * `EncryptionDataNotifier`.
   *
   * For now we only send encryption data once per notifier at most as it was
   * historically the only encountered case (encryption data in initialization
   * segment).
   * TODO: remove rule?
   */
  private _hasSentEncryptionData: boolean;
  /**
   * `Representation` linked to that `EncryptionDataNotifier`. Might be mutated
   * to add encryption data information.
   */
  private _representation: Representation;
  /** Callback to call when encryption information is first encountered. */
  private _notify: (contentProtections: IRepresentationProtectionData[]) => void;

  /**
   * Create a new `EncryptionDataNotifier`.
   * @param {Object} param0
   * @param {string|undefined} param0.drmSystemId - If known the ID in hex
   * format of the used DRM system (playready, widevine etc.).
   * @param {Object} param0.representation - Object describing the
   * Representation (including protection-related information). New encryption
   * data might be added to it by this class.
   * @param {Function} param0.notify - Function that will be called once new
   * protection data has been detected.
   */
  constructor({
    drmSystemId,
    representation,
    notify,
  }: {
    drmSystemId: string | undefined;
    representation: Representation;
    notify: (contentProtections: IRepresentationProtectionData[]) => void;
  }) {
    this._hasSentEncryptionData = false;
    this._representation = representation;
    this._notify = notify;

    // If the DRM system id is already known, and if we already have encryption data
    // for it, we may not need to wait until the initialization segment is loaded to
    // signal required protection data, thus performing License negotiations sooner
    if (drmSystemId !== undefined) {
      const encryptionData = representation.getEncryptionData(drmSystemId);

      // If some key ids are not known yet, it may be safer to wait for this initialization
      // segment to be loaded first
      if (
        encryptionData.length > 0 &&
        encryptionData.every((e) => e.keyIds !== undefined)
      ) {
        this._hasSentEncryptionData = true;
        notify(encryptionData);
      }
    }
  }

  /**
   * Signal that new protection data information is available.
   * If necessary, that data will be added to the Representation and sent
   * through the `notifiy` callback passed in constructor.
   * @param {Array.<Object>} data - The new protection data encountered.
   */
  public onNewProtectionData(data: IProtectionDataInfo[]): void {
    // Supplementary encryption information might have been parsed.
    for (const protInfo of data) {
      // TODO better handle use cases like key rotation by not always grouping
      // every protection data together? To check.
      this._representation.addProtectionData(
        protInfo.initDataType,
        protInfo.keyId,
        protInfo.initData,
      );
    }

    // Now that the initialization segment has been parsed - which may have
    // included encryption information - take care of the encryption event
    // if not already done.
    if (!this._hasSentEncryptionData) {
      const allEncryptionData = this._representation.getAllEncryptionData();
      if (allEncryptionData.length > 0) {
        this._notify(allEncryptionData);
        this._hasSentEncryptionData = true;
      }
    }
  }
}
