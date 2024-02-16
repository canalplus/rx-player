import errorMessage from "./error_message";
/**
 * Error linked to the WebWorker initialization.
 *
 * @class WorkerInitializationError
 * @extends Error
 */
export default class WorkerInitializationError extends Error {
    /**
     * @param {string} code
     * @param {string} message
     */
    constructor(code, message) {
        super();
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(this, WorkerInitializationError.prototype);
        this.name = "WorkerInitializationError";
        this.type = "WORKER_INITIALIZATION_ERROR";
        this.code = code;
        this.message = errorMessage(this.code, message);
    }
}
