import type { ITextDisplayer } from "../../../main_thread/types";
import type { IMediaSourceInterface } from "../../../mse";
import type { ITrackType } from "../../../public_types";
import type { IRange } from "../../../utils/ranges";
/**
 * Returns a JS object where keys are the type of buffers (e.g. "audio",
 * "video", "text") and values are the corresponding range of buffered
 * data according to the given `IMediaSourceInterface` (or `null` if not
 * known / nothing is buffered).
 * @param {Object|null} mediaSourceInterface
 * @param {Object|null} textDisplayer
 * @returns {Object}
 */
export default function getBufferedDataPerMediaBuffer(mediaSourceInterface: IMediaSourceInterface | null, textDisplayer: ITextDisplayer | null): Record<ITrackType, IRange[] | null>;
