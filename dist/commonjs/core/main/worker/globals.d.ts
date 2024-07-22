import SharedReference from "../../../utils/reference";
import type { IResolutionInfo } from "../../adaptive";
/** Buffer "goal" at which we stop downloading new segments. */
declare const wantedBufferAhead: SharedReference<number>;
/** Buffer maximum size in kiloBytes at which we stop downloading */
declare const maxVideoBufferSize: SharedReference<number>;
/** Max buffer size after the current position, in seconds (we GC further up). */
declare const maxBufferAhead: SharedReference<number>;
/** Max buffer size before the current position, in seconds (we GC further down). */
declare const maxBufferBehind: SharedReference<number>;
declare const limitVideoResolution: SharedReference<IResolutionInfo>;
declare const throttleVideoBitrate: SharedReference<number>;
export { wantedBufferAhead, maxVideoBufferSize, maxBufferBehind, maxBufferAhead, limitVideoResolution, throttleVideoBitrate, };
//# sourceMappingURL=globals.d.ts.map