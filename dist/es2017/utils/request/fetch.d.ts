import type { CancellationSignal } from "../task_canceller";
/** Object returned by `fetchRequest` after the fetch operation succeeded. */
export interface IFetchedStreamComplete {
    /** Duration of the whole request, in milliseconds. */
    requestDuration: number;
    /** Monotonically-raising timestamp at the time the request was received. */
    receivedTime: number;
    /** Monotonically-raising timestamp at the time the request was started. */
    sendingTime: number;
    /** Size of the entire emitted data, in bytes. */
    size: number;
    /** HTTP status of the request performed. */
    status: number;
    /** URL of the recuperated data (post-redirection if one). */
    url: string;
}
/** Object emitted by `fetchRequest` when a new chunk of the data is available. */
export interface IFetchedDataObject {
    /** Monotonically-raising timestamp at the time this data was recuperated. */
    currentTime: number;
    /** Duration of the request until `currentTime`, in milliseconds. */
    duration: number;
    /** Size in bytes of the data emitted as `chunk`. */
    chunkSize: number;
    /** Cumulated size of the received data by the request until now. */
    size: number;
    /** Monotonically-raising timestamp at the time the request began. */
    sendingTime: number;
    /** URL of the recuperated data (post-redirection if one). */
    url: string;
    /**
     * Value of the "Content-Length" header, which should (yet also might not be)
     * the size of the complete data that will be fetched.
     */
    totalSize: number | undefined;
    /**
     * Current available chunk, which might only be a sub-part of the whole
     * data.
     * To retrieve the whole data, all `chunk` received from `fetchRequest` can be
     * concatenated.
     */
    chunk: ArrayBuffer;
}
/** Options for the `fetchRequest` utils function. */
export interface IFetchOptions {
    /** URL you want to perform the HTTP GET request on. */
    url: string;
    /**
     * Callback called as new data is available.
     * This callback might be called multiple times with chunks of the complete
     * data until the fetch operation is finished.
     */
    onData: (data: IFetchedDataObject) => void;
    /**
     * Signal allowing to cancel the fetch operation.
     * If cancellation happens while the request is pending, `fetchRequest` will
     * reject with the corresponding `CancellationError`.
     */
    cancelSignal: CancellationSignal;
    /** Dictionary of headers you want to set. `null` or `undefined` for no header. */
    headers?: Record<string, string> | null | undefined;
    /**
     * Optional timeout for the HTTP GET request perfomed by `fetchRequest`.
     * This timeout is just enabled until the HTTP response from the server, even
     * if not all data has been received yet.
     */
    timeout?: number | undefined;
    /**
     * Optional connection timeout, in milliseconds, after which the request is canceled
     * if the responses headers has not being received.
     * Do not set or set to "undefined" to disable it.
     */
    connectionTimeout?: number | undefined;
}
export default function fetchRequest(options: IFetchOptions): Promise<IFetchedStreamComplete>;
/**
 * Returns true if fetch should be supported in the current browser.
 * @return {boolean}
 */
export declare function fetchIsSupported(): boolean;
//# sourceMappingURL=fetch.d.ts.map