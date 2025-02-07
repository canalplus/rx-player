/**
 * This file is the entry point of the worker part of the RxPlayer, only relied
 * on when running in a multithread mode.
 */

import initializeCoreEntry from "./core/entry";
import type { ICoreMessage } from "./core/types";
import { CoreMessageType } from "./core/types";
import log from "./experimental/tools/mediaCapabilitiesProber/log";
import features from "./features";
import Manifest from "./manifest/classes";
import DashJsParser from "./parsers/manifest/dash/js-parser";
import DashWasmParser from "./parsers/manifest/dash/wasm-parser";
import createDashPipelines from "./transports/dash";
import globalScope from "./utils/global_scope";

// Initialize Manually a `DashWasmParser` and add the feature.
// TODO allow worker-side feature-switching? Not sure how
const dashWasmParser = new DashWasmParser();
features.dashParsers.wasm = dashWasmParser;
features.dashParsers.js = DashJsParser;
features.transports.dash = createDashPipelines;

globalScope.onmessageerror = (_msg: MessageEvent) => {
  log.error("Core", "Error when receiving message from main thread.");
};
initializeCoreEntry((handler) => {
  onmessage = handler;
}, sendMessage);

/**
 * Perform a `postMessage` to main thread with the given message.
 * Arguments follow the `postMessage` API.
 * @param {Object} msg
 * @param {Array.<Object>} [transferables]
 */
function sendMessage(msg: ICoreMessage, transferables?: Transferable[]): void {
  updateMessageFormat(msg);

  log.debug("M<--C", "Sending message from worker", { name: msg.type });
  if (transferables === undefined) {
    postMessage(msg);
  } else {
    // TypeScript made a mistake here, and 2busy2fix
    (postMessage as (msg: ICoreMessage, transferables: Transferable[]) => void)(
      msg,
      transferables,
    );
  }
}

/**
 * Ensure that we're sending data that can be serialized, as this is a
 * requirement for the `postMessage` browser API.
 *
 * If necessary, mutations are done in place.
 * @param {Object} msg
 */
function updateMessageFormat(msg: ICoreMessage): void {
  if (
    msg.type === CoreMessageType.ManifestReady ||
    msg.type === CoreMessageType.ManifestUpdate
  ) {
    if (msg.value.manifest instanceof Manifest) {
      msg.value.manifest = msg.value.manifest.getMetadataSnapshot();
      if (msg.type === CoreMessageType.ManifestUpdate) {
        // Remove `periods` key to reduce cost of an unnecessary manifest
        // clone.
        msg.value.manifest.periods = [];
      }
    } else {
      log.warn("Core", "the Manifest instance should be communicated to `sendMessage`.");
    }
  }
}
