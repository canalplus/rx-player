/**
 * `true` if the current code is running in a WebWorker.
 */
export default typeof WorkerGlobalScope !== "undefined" &&
    self instanceof WorkerGlobalScope;
