/**
 * This file is the entry point of the worker part of the RxPlayer, only relied
 * on when running in a multithread mode.
 */

import initializeWorkerMain from "./core/main/worker";
import log from "./experimental/tools/mediaCapabilitiesProber/log";
import features from "./features";
import Manifest from "./manifest/classes";
import { WorkerMessageType, type IWorkerMessage } from "./multithread_types";
import DashFastJsParser from "./parsers/manifest/dash/fast-js-parser";
import DashWasmParser from "./parsers/manifest/dash/wasm-parser";
import createDashPipelines from "./transports/dash";
import globalScope from "./utils/global_scope";

// Initialize Manually a `DashWasmParser` and add the feature.
// TODO allow worker-side feature-switching? Not sure how
const dashWasmParser = new DashWasmParser();
features.dashParsers.wasm = dashWasmParser;
features.dashParsers.fastJs = DashFastJsParser;
features.transports.dash = createDashPipelines;

globalScope.onmessageerror = (_msg: MessageEvent) => {
  log.error("Worker: Error when receiving message from main thread.");
};
initializeWorkerMain((handler) => {
  onmessage = handler;
}, sendMessage);

/**
 * Perform a `postMessage` to main thread with the given message.
 * Arguments follow the `postMessage` API.
 * @param {Object} msg
 * @param {Array.<Object>} [transferables]
 */
function sendMessage(msg: IWorkerMessage, transferables?: Transferable[]): void {
  updateMessageFormat(msg);

  log.debug("<--- Sending to Main:", msg.type);
  if (transferables === undefined) {
    postMessage(msg);
  } else {
    // TypeScript made a mistake here, and 2busy2fix
    (postMessage as (msg: IWorkerMessage, transferables: Transferable[]) => void)(
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
function updateMessageFormat(msg: IWorkerMessage): void {
  if (
    msg.type === WorkerMessageType.ManifestReady ||
    msg.type === WorkerMessageType.ManifestUpdate
  ) {
    if (msg.value.manifest instanceof Manifest) {
      msg.value.manifest = msg.value.manifest.getMetadataSnapshot();
      if (msg.type === WorkerMessageType.ManifestUpdate) {
        // Remove `periods` key to reduce cost of an unnecessary manifest
        // clone.
        msg.value.manifest.periods = [];
      }
    } else {
      log.warn("Worker: the Manifest instance should be communicated to `sendMessage`.");
    }
  }
}
