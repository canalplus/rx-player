import config from "../../../config";
import SharedReference from "../../../utils/reference";
import type { IResolutionInfo } from "../../adaptive";

const { DEFAULT_WANTED_BUFFER_AHEAD,
        DEFAULT_MAX_VIDEO_BUFFER_SIZE,
        DEFAULT_MAX_BUFFER_AHEAD,
        DEFAULT_MAX_BUFFER_BEHIND } = config.getCurrent();

/** Buffer "goal" at which we stop downloading new segments. */
const wantedBufferAhead = new SharedReference(DEFAULT_WANTED_BUFFER_AHEAD);

/** Buffer maximum size in kiloBytes at which we stop downloading */
const maxVideoBufferSize = new SharedReference(DEFAULT_MAX_VIDEO_BUFFER_SIZE);

/** Max buffer size after the current position, in seconds (we GC further up). */
const maxBufferAhead = new SharedReference(DEFAULT_MAX_BUFFER_AHEAD);

/** Max buffer size before the current position, in seconds (we GC further down). */
const maxBufferBehind = new SharedReference(DEFAULT_MAX_BUFFER_BEHIND);

const limitVideoResolution = new SharedReference<IResolutionInfo>({
  height: undefined,
  width: undefined,
  pixelRatio: 1,
});
const throttleVideoBitrate = new SharedReference(Infinity);

export {
  wantedBufferAhead,
  maxVideoBufferSize,
  maxBufferBehind,
  maxBufferAhead,
  limitVideoResolution,
  throttleVideoBitrate,
};
