/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class facilitating asynchronous task cancellation.
 *
 * This class can be used to notify some code running an asynchronous task (for
 * example, a request) that is should abort what it is doing (for example, abort
 * a request when it isn't needed anymore).
 *
 * To do that, the code which might ask for cancellation have to create a new
 * `TaskCanceller`:
 * ```js
 * const canceller = new TaskCanceller();
 * ```
 *
 * And has to provide its associated `CancellationSignal` to the code running
 * the asynchronous task:
 * ```js
 * runAsyncTask(canceller.signal);
 * ```
 *
 * In the asynchronous task, the signal can be listened to (see documentation
 * on `CancellationSignal` for more information):
 * ```js
 * function runAsyncTask(cancellationSignal) {
 *  // Let's say this function returns a Promise (this is not mandatory however)
 *  return Promise((resolve, reject) => {
 *    // In this example, we'll even catch the case where an asynchronous task
 *    // was already cancelled before being called.
 *    // This ensure that no code will run if that's the case.
 *    if (cancellationSignal.isCancelled) {
 *      // Here we're rejecting the CancellationError to notify the caller that
 *      // this error was due to the task being aborted.
 *      reject(cancellationSignal.cancellationError);
 *      return;
 *    }
 *
 *    // Example:
 *    // performing asynchronous task and registering callbacks on success/failure.
 *    const myCancellableTask = doSomeAsyncTasks()
 *      .onFinished(onTaskFinished);
 *      .onFailed(onTaskFailed);
 *
 *    // Run a callback when/if the corresponding `TaskCanceller` was triggered.
 *    // Run immediately if the TaskCanceller was already triggered.
 *    const deregisterSignal = cancellationSignal.register(onCancellation);
 *
 *    // Callback called on cancellation (if this task was cancelled while the
 *    // cancellationSignal's listener is still registered).
 *    // The `error` in argument is linked to that cancellation. It is usually
 *    // expected that the same Error instance is used when rejecting Promises.
 *    function onCancellation(error : CancellationError) {
 *      // abort asynchronous task
 *      myCancellableTask.cancel();
 *
 *      // In this example, reject the current pending Promise
 *      reject(CancellationError);
 *    }
 *
 *    // Callback called after the asynchronous task has finished with success.
 *    function onTaskFinished() {
 *      // Stop listening to the cancellationSignal
 *      deregisterSignal();
 *
 *      // Resolve the Promise
 *      resolve();
 *    }
 *
 *    // Callback called after the asynchronous task has finished with failure.
 *    function onTaskFailed(someError : Error) {
 *      // Stop listening to the cancellationSignal
 *      deregisterSignal();
 *
 *      // Resolve the Promise
 *      reject(error);
 *    }
 *  });
 * }
 * ```
 *
 * The code asking for cancellation can then trigger a cancellation at any time
 * (even before the signal was given) and listen to possible CancellationErrors
 * to know when it was cancelled.
 * ```js
 * const canceller = new TaskCanceller();
 *
 * runAsyncTask(canceller.signal)
 *   .then(() => { console.log("Task succeeded!"); )
 *   .catch((err) => {
 *      if (TaskCanceller.isCancellationError(err)) {
 *        console.log("Task cancelled!");
 *      } else {
 *        console.log("Task failed:", err);
 *      }
 *   });
 * canceller.cancel(); // Cancel the task, calling registered callbacks
 * ```
 * @class TaskCanceller
 */
export default class TaskCanceller {
    /**
     * `CancellationSignal` that can be given to an async task, so it can be
     * notified that it should be aborted when this `TaskCanceller` is triggered
     * (through its `cancel` method).
     */
    readonly signal: CancellationSignal;
    /**
     * `true` if this `TaskCanceller` has already been triggered.
     * `false` otherwise.
     */
    private _isUsed;
    /**
     * @private
     * Internal function called when the `TaskCanceller` is triggered`.
     */
    private _trigger;
    /**
     * Creates a new `TaskCanceller`, with its own `CancellationSignal` created
     * as its `signal` provide.
     * You can then pass this property to async task you wish to be cancellable.
     */
    constructor();
    /**
     * Returns `true` if this `TaskCanceller` has already been triggered.
     * `false` otherwise.
     */
    isUsed(): boolean;
    /**
     * Bind this `TaskCanceller` to a `CancellationSignal`, so the former
     * is automatically cancelled when the latter is triggered.
     *
     * Note that this call registers a callback on the given signal, until either
     * the current `TaskCanceller` is cancelled or until this given
     * `CancellationSignal` is triggered.
     * To avoid leaking memory, the returned callback allow to undo this link.
     * It should be called if/when that link is not needed anymore, such as when
     * there is no need for this `TaskCanceller` anymore.
     *
     * @param {Object} signal
     * @returns {Function}
     */
    linkToSignal(signal: CancellationSignal): () => void;
    /**
     * "Trigger" the `TaskCanceller`, notify through its associated
     * `CancellationSignal` (its `signal` property) that a task should be aborted.
     *
     * Once called the `TaskCanceller` is permanently triggered.
     *
     * An optional CancellationError can be given in argument for when this
     * cancellation is actually triggered as a chain reaction from a previous
     * cancellation.
     * @param {Error} [srcError]
     */
    cancel(srcError?: CancellationError): void;
    /**
     * Check that the `error` in argument is a `CancellationError`, most likely
     * meaning that the linked error is due to a task aborted via a
     * `CancellationSignal`.
     * @param {*} error
     * @returns {boolean}
     */
    static isCancellationError(error: unknown): boolean;
}
/**
 * Signal allowing to be notified when the linked task needs to be aborted.
 * @class
 */
export declare class CancellationSignal {
    /**
     * Error associated to the cancellation, only set if the `CancellationSignal`
     * has been used (which means that the task has been cancelled).
     *
     * Can be used to notify to a caller that this task was aborted (for example
     * by rejecting it through the Promise associated to that task).
     *
     * Always set if `isCancelled` is equal to `true`.
     */
    cancellationError: CancellationError | null;
    /**
     * @private
     * Functions called when the corresponding `TaskCanceller` is triggered.
     * Those should perform all logic allowing to cancel the current task(s)
     * which depend on this CancellationSignal.
     */
    private _listeners;
    /**
     * True when the cancellation order was already triggered, meaning that the
     * linked task needs to be aborted.
     */
    private _isCancelled;
    /**
     * Creates a new CancellationSignal.
     * /!\ Note: Only a `TaskCanceller` is supposed to be able to create one.
     * @param {Function} registerToSource - Function called when the task is
     * cancelled.
     */
    constructor(registerToSource: (listener: ICancellationListener) => void);
    /**
     * Returns `true` when the cancellation order was already triggered, meaning
     * that the linked task needs to be aborted.
     * @returns boolean
     */
    isCancelled(): boolean;
    /**
     * Registers a function that will be called when/if the current task is
     * cancelled.
     *
     * Multiple calls to `register` can be performed to register multiple
     * callbacks on cancellation associated to the same `CancellationSignal`.
     *
     * @param {Function} fn - This function should perform all logic allowing to
     * abort everything the task is doing.
     *
     * It takes in argument the `CancellationError` which was created when the
     * task was aborted.
     * You can use this error to notify callers that the task has been aborted,
     * for example through a rejected Promise.
     *
     * @return {Function} - Removes that cancellation listener. You can call this
     * once you don't want the callback to be triggered anymore (e.g. after the
     * task succeeded or failed).
     * You don't need to call that function when cancellation has already been
     * performed.
     */
    register(fn: ICancellationListener): () => void;
    /**
     * De-register a function registered through the `register` function.
     * Do nothing if that function wasn't registered.
     *
     * You can call this method when using the return value of `register` is not
     * practical.
     * @param {Function} fn
     */
    deregister(fn: ICancellationListener): void;
}
/**
 * Helper type allowing a `CancellationSignal` to register to a cancellation asked
 * by a `TaskCanceller`.
 */
export type ICancellationListener = (error: CancellationError) => void;
/**
 * Error created when a task is cancelled.
 * @class CancellationError
 * @extends Error
 */
export declare class CancellationError extends Error {
    readonly name: "CancellationError";
    readonly message: string;
    constructor();
}
