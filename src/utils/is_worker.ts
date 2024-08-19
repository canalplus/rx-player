// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const WorkerGlobalScope: any;

/**
 * `true` if the current code is running in a WebWorker.
 */
export default typeof WorkerGlobalScope !== "undefined" &&
  self instanceof WorkerGlobalScope;
