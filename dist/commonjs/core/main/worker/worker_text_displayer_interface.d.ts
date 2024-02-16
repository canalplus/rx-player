import type { ITextDisplayerData } from "../../../main_thread/types";
import type { IRemoveTextDataWorkerMessage, IStopTextDisplayerWorkerMessage, IResetTextDisplayerWorkerMessage, IPushTextDataWorkerMessage } from "../../../multithread_types";
import type { IRange } from "../../../utils/ranges";
import type { ITextDisplayerInterface } from "../../segment_sinks";
/**
 * Implementation of an `ITextDisplayerInterface` running in a WebWorker
 * (so, in a different thread than the `ITextDisplayer`).
 *
 * @class WorkerTextDisplayerInterface
 */
export default class WorkerTextDisplayerInterface implements ITextDisplayerInterface {
    private _contentId;
    private _messageSender;
    _queues: {
        pushTextData: Array<{
            resolve: (ranges: IRange[]) => void;
            reject: (err: unknown) => void;
        }>;
        remove: Array<{
            resolve: (ranges: IRange[]) => void;
            reject: (err: unknown) => void;
        }>;
    };
    /**
     * @param {string} contentId
     * @param {Object} messageSender
     */
    constructor(contentId: string, messageSender: (msg: IWorkerTextDisplayerInterfaceMessage) => void);
    /**
     * @see ITextDisplayerInterface
     */
    pushTextData(infos: ITextDisplayerData): Promise<IRange[]>;
    /**
     * @see ITextDisplayerInterface
     */
    remove(start: number, end: number): Promise<IRange[]>;
    /**
     * @see ITextDisplayerInterface
     */
    reset(): void;
    /**
     * @see ITextDisplayerInterface
     */
    stop(): void;
    private _resetCurrentQueue;
    /**
     * @param {Array.<Object>} ranges
     */
    onPushedTrackSuccess(ranges: IRange[]): void;
    /**
     * @param {unknown} err
     */
    onPushedTrackError(err: Error): void;
    /**
     * @param {Array.<Object>} ranges
     */
    onRemoveSuccess(ranges: IRange[]): void;
    /**
     * @param {unknown} err
     */
    onRemoveError(err: Error): void;
}
type IWorkerTextDisplayerInterfaceMessage = IPushTextDataWorkerMessage | IRemoveTextDataWorkerMessage | IStopTextDisplayerWorkerMessage | IResetTextDisplayerWorkerMessage;
export {};
