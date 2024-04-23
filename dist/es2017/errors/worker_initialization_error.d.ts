type IWorkerInitializationErrorCode = "UNKNOWN_ERROR" | "SETUP_ERROR" | "INCOMPATIBLE_ERROR";
/**
 * Error linked to the WebWorker initialization.
 *
 * @class WorkerInitializationError
 * @extends Error
 */
export default class WorkerInitializationError extends Error {
    readonly name: "WorkerInitializationError";
    readonly type: "WORKER_INITIALIZATION_ERROR";
    readonly message: string;
    readonly code: IWorkerInitializationErrorCode;
    /**
     * @param {string} code
     * @param {string} message
     */
    constructor(code: IWorkerInitializationErrorCode, message: string);
}
export {};
