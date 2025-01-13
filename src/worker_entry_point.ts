/**
 * This file is the entry point of the worker part of the RxPlayer, only relied
 * on when running in a multithread mode.
 */

import initializeWorkerMain from "./core/main/worker";
import {
  limitVideoResolution,
  maxBufferAhead,
  maxBufferBehind,
  maxVideoBufferSize,
  throttleVideoBitrate,
  wantedBufferAhead,
} from "./core/main/worker/globals";
import log from "./experimental/tools/mediaCapabilitiesProber/log";
import features from "./features";
import type { IWorkerMessage } from "./multithread_types";
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
initializeWorkerMain(
  (handler) => {
    onmessage = handler;
  },
  sendMessage,
  {
    limitVideoResolution,
    maxBufferAhead,
    maxBufferBehind,
    maxVideoBufferSize,
    throttleVideoBitrate,
    wantedBufferAhead,
  },
);

function sendMessage(msg: IWorkerMessage, transferables?: Transferable[]): void {
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
