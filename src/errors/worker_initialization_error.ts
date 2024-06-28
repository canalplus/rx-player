import errorMessage from "./error_message";

type IWorkerInitializationErrorCode =
  | "UNKNOWN_ERROR"
  | "SETUP_ERROR"
  | "INCOMPATIBLE_ERROR";

/**
 * Error linked to the WebWorker initialization.
 *
 * @class WorkerInitializationError
 * @extends Error
 */
export default class WorkerInitializationError extends Error {
  public readonly name: "WorkerInitializationError";
  public readonly type: "WORKER_INITIALIZATION_ERROR";
  public readonly code: IWorkerInitializationErrorCode;

  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code: IWorkerInitializationErrorCode, message: string) {
    super(errorMessage(code, message));
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, WorkerInitializationError.prototype);

    this.name = "WorkerInitializationError";
    this.type = "WORKER_INITIALIZATION_ERROR";
    this.code = code;
  }
}
