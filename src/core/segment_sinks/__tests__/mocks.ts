import { makeMockedClass } from "../../../utils/test-utils";
import type { SegmentSink } from "../implementations";
import type SegmentInventory from "../inventory";
import type BufferedHistory from "../inventory/buffered_history";

export const DummySegmentSink = makeMockedClass<SegmentSink>(
  {
    removeBuffer: notImplemented("removeBuffer"),
    declareInitSegment: notImplemented("declareInitSegment"),
    pushChunk: notImplemented("pushChunk"),
    freeInitSegment: notImplemented("freeInitSegment"),
    synchronizeInventory: notImplemented("synchronizeInventory"),
    getPendingOperations: notImplemented("getPendingOperations"),
    getLastKnownInventory: notImplemented("getLastKnownInventory"),
    getSegmentHistory: notImplemented("getSegmentHistory"),
    signalSegmentComplete: notImplemented("signalSegmentComplete"),
    dispose: notImplemented("dispose"),
  },
  {
    bufferType: "video",
    codec: "not implemented",
  },
);

export const DummySegmentInventory = makeMockedClass<SegmentInventory>(
  {
    reset: notImplemented("reset"),
    synchronizeBuffered: notImplemented("synchronizeBuffered"),
    getInventory: notImplemented("getInventory"),
    getHistoryFor: notImplemented("getHistoryFor"),
    insertChunk: notImplemented("insertChunk"),
    completeSegment: notImplemented("completeSegment"),
  },
  {},
);

export const DummyBufferedHistory = makeMockedClass<BufferedHistory>(
  {
    addBufferedSegment: notImplemented("addBufferedSegment"),
    getHistoryFor: notImplemented("getHistoryFor"),
  },
  {},
);

function notImplemented(name: string): () => never {
  return () => {
    throw new Error(`${name} not implemented`);
  };
}
