import {
  CancellationError,
  CancellationSignal,
} from "./task_canceller";

/**
 * Returns a Promise linked to a `CancellationSignal`, which will reject the
 * corresponding `CancellationError` if that signal emits before the wanted
 * task finishes (either on success or on error).
 *
 * The given callback mimicks the Promise interface with the added possibility
 * of returning a callback which will be called when and if the task is
 * cancelled before being either resolved or rejected.
 * In that case, that logic will be called just before the Promise is rejected
 * with the corresponding `CancellationError`.
 * The point of this callback is to implement aborting logic, such as for
 * example aborting a request.
 *
 * @param {Object} cancellationSignal - The `CancellationSignal` the returned
 * Promise will be linked to.
 * @param {Function} cb - The function implementing the cancellable Promise. Its
 * arguments follow Promise's semantics but it can also return a function which
 * will be called when and if `cancellationSignal` emits before either arguments
 * are called.
 * @returns {Promise} - The created Promise, which will resolve when and if the
 * first argument to `cb` is called first and reject either if the second
 * argument to `cb` is called first or if the given `CancellationSignal` emits
 * before either of the two previous conditions.
 */
export default function createCancellablePromise<T>(
  cancellationSignal : CancellationSignal,
  cb : (
    resolve : (val : T) => void,
    reject : (err : unknown) => void,
  ) => (() => void) | void
) : Promise<T> {
  let abortingLogic : (() => void) | void;
  return new Promise((res, rej) => {
    if (cancellationSignal.cancellationError !== null) {
      // If the signal was already triggered before, do not even call `cb`
      return rej(cancellationSignal.cancellationError);
    }

    let hasUnregistered = false;
    abortingLogic = cb(
      function onCancellablePromiseSuccess(val : T) {
        cancellationSignal.deregister(onCancellablePromiseCancellation);
        hasUnregistered = true;
        res(val);
      },
      function onCancellablePromiseFailure(err : unknown) {
        cancellationSignal.deregister(onCancellablePromiseCancellation);
        hasUnregistered = true;
        rej(err);
      }
    );

    if (!hasUnregistered) {
      cancellationSignal.register(onCancellablePromiseCancellation);
    }

    function onCancellablePromiseCancellation(error : CancellationError) {
      if (abortingLogic !== undefined) {
        abortingLogic();
      }
      rej(error);
    }
  });
}
