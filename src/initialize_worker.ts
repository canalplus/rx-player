/**
 * This file is the entry point of the default "RxPlayer Worker".
 * It is only relied on when running in a multithread mode.
 *
 * Note that the application can also define its own "RxPlayer worker" in which
 * case this file is not depended on.
 */

import initializeCoreEntry from "./core/entry";
import type { ICorePlugins } from "./core/entry";
import type { ICoreMessage } from "./core/types";
import { CoreMessageType } from "./core/types";
import features from "./features";
import log from "./log";
import Manifest from "./manifest/classes";
import DashJsParser from "./parsers/manifest/dash/js-parser";
import DashWasmParser from "./parsers/manifest/dash/wasm-parser";
import createDashPipelines from "./transports/dash";
import globalScope from "./utils/global_scope";

export default function initializeWorker(corePlugins: ICorePlugins): void {
  // Initialize Manually a `DashWasmParser` and add the feature.
  const dashWasmParser = new DashWasmParser();
  features.dashParsers.wasm = dashWasmParser;
  features.dashParsers.js = DashJsParser;
  features.transports.dash = createDashPipelines;

  globalScope.onmessageerror = (_msg: MessageEvent) => {
    log.error("Core", "Error when receiving message from main thread.");
  };
  initializeCoreEntry(
    (handler) => {
      onmessage = handler;
    },
    sendMessage,
    corePlugins,
  );
}

/**
 * Perform a `postMessage` to main thread with the given message.
 * Arguments follow the `postMessage` API.
 * @param {Object} msg
 * @param {Array.<Object>} [transferables]
 */
function sendMessage(msg: ICoreMessage, transferables?: Transferable[]): void {
  updateMessageFormat(msg);

  if (msg.type !== CoreMessageType.LogMessage) {
    log.debug("M<--C", "Sending message from worker", { name: msg.type });
  }
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
