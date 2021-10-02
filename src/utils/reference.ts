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

import {
  Observable,
  Subscriber,
} from "rxjs";
import { CancellationSignal } from "./task_canceller";

/**
 * A value behind a shared reference, meaning that any update to its value from
 * anywhere can be retrieved from any other parts of the code in posession of
 * the "same" (i.e. not cloned) `ISharedReference`.
 *
 * @example
 * ```ts
 * const myVal = 1;
 * const myRef : ISharedReference<number> = createSharedReference(1);
 *
 * function DoThingsWithVal(num : number) {
 *   num = 2;
 * }
 *
 * function DoThingsWithRef(num : ISharedReference<number>) {
 *   num.setValue(2);
 * }
 *
 * myRef.asObservable().subscribe((val) => {
 *   console.log(val); // outputs first `1`, then `2`
 * });
 *
 * DoThingsWithVal(myVal);
 * console.log(myVal); // output: 1
 *
 * DoThingsWithRef(myRef);
 * console.log(myRef.getValue()); // output: 2
 *
 * myRef.asObservable().subscribe((val) => {
 *   console.log(val); // outputs only `2`
 * });
 * ```
 *
 * This type was added because we found that the usage of an explicit type for
 * those use cases makes the intent of the corresponding code clearer.
 */
export interface ISharedReference<T> {
  /**
   * Get the last set value for this shared reference.
   * @returns {*}
   */
  getValue() : T;

  /**
   * Update the value of this shared reference.
   * @param {*} newVal
   */
  setValue(newVal : T) : void;

  /**
   * Update the value of this shared reference only if the value changed.
   *
   * Note that this function only performs a strict equality reference through
   * the "===" operator. Different objects that are structurally the same will
   * thus be considered different.
   * @param {*} newVal
   */
  setValueIfChanged(newVal : T) : void;

  /**
   * Return an Observable which synchronously emits the current value (unless
   * the `skipCurrentValue` argument has been set to `true`) and then emit its
   * new value each time it is updated.
   * @param {boolean} [skipCurrentValue]
   * @returns {Observable}
   */
  asObservable(skipCurrentValue? : boolean) : Observable<T>;
  /**
   * Allows to register a callback to be called each time the value inside the
   * reference is updated.
   * @param {Function} cb - Callback to be called each time the reference is
   * updated. Takes the new value im argument.
   * @param {Object} [options]
   * @param {Object} [options.clearSignal] - Allows to provide a
   * CancellationSignal which will unregister the callback when it emits.
   * @param {boolean} [options.emitCurrentValue] - If `true`, the callback will
   * also be immediately called with the current value.
   */
  onUpdate(
    cb : (val : T) => void,
    options? : {
      clearSignal?: CancellationSignal | undefined;
      emitCurrentValue?: boolean | undefined;
    },
  ) : void;
  /**
   * Indicate that no new values will be emitted.
   * Allows to automatically close all Observables generated from this shared
   * reference.
   */
  finish() : void;
}

/**
 * An `ISharedReference` which can only be read and not updated.
 *
 * @example
 * ```ts
 * const myReference : ISharedReference<number> = createSharedReference(4);
 *
 * function shouldOnlyReadIt(roRef : IReadOnlySharedReference<number>) {
 *   console.log("current value:", roRef.getValue());
 * }
 *
 * shouldOnlyReadIt(myReference); // output: "current value: 4"
 *
 * myReference.setValue(12);
 * shouldOnlyReadIt(myReference); // output: "current value: 12"
 * ```
 *
 * Because an `ISharedReference` is structurally compatible to a
 * `IReadOnlySharedReference`, and because of TypeScript variance rules, it can
 * be upcasted into a `IReadOnlySharedReference` at any time to make it clear in
 * the code that some logic is not supposed to update the referenced value.
 */
export interface IReadOnlySharedReference<T> {
  /** Get the last value set on that reference. */
  getValue() : T;
  /**
   * Returns an Observable notifying this reference's value each time it is
   * updated.
   *
   * Also emit its current value on subscription unless its argument is set to
   * `true`.
   */
  asObservable(skipCurrentValue? : boolean) : Observable<T>;

  /**
   * Triggers a callback each time this reference's value is updated.
   *
   * Can be given several options as argument:
   *   - clearSignal: When the attach `CancellationSignal` emits, the given
   *     callback will not be called anymore on reference updates.
   *   - emitCurrentValue: If `true`, the callback will be called directly and
   *     synchronously on this call with its current value.
   * @param {Function} cb
   * @param {Object} [options]
   */
  onUpdate(
    cb : (val : T) => void,
    options? : {
      clearSignal?: CancellationSignal | undefined;
      emitCurrentValue?: boolean | undefined;
    } | undefined,
  ) : void;
}

/**
 * Create an `ISharedReference` object encapsulating the mutable `initialValue`
 * value of type T.
 *
 * @see ISharedReference
 * @param {*} initialValue
 * @returns {Observable}
 */
export function createSharedReference<T>(initialValue : T) : ISharedReference<T> {
  /** Current value referenced by this `ISharedReference`. */
  let value = initialValue;

  /**
   * Attributes each linked to a single registered callbacks which listen to the
   * referenced value's updates.
   *
   * Contains the following properties:
   *   - `trigger`: Function which will be called with the new reference's value
   *     once it changes
   *   - `complete`: Allows to clean-up the listener, will be called once the
   *     reference is finished.
   *   - `hasBeenCleared`: becomes `true` when the Observable becomes
   *     unsubscribed and thus when it is removed from the `cbs` array.
   *     Adding this property allows to detect when a previously-added
   *     listener has since been removed e.g. as a side-effect during a
   *     function call.
   *   - `complete`: Callback to call when the current Reference is "finished".
   */
  const cbs : Array<{ trigger : (a: T) => void;
                      complete : () => void;
                      hasBeenCleared : boolean; }> = [];

  let isFinished = false;

  return {
    /**
     * Returns the current value of this shared reference.
     * @returns {*}
     */
    getValue() : T {
      return value;
    },

    /**
     * Update the value of this shared reference.
     * @param {*} newVal
     */
    setValue(newVal : T) : void {
      if (isFinished) {
        if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV as number) {
          /* eslint-disable-next-line no-console */
          console.error("Finished shared references cannot be updated");
        }
        return;
      }
      value = newVal;

      if (cbs.length === 0) {
        return;
      }
      const clonedCbs = cbs.slice();
      for (const cbObj of clonedCbs) {
        try {
          if (!cbObj.hasBeenCleared) {
            cbObj.trigger(newVal);
          }
        } catch (_) {
          /* nothing */
        }
      }
    },

    /**
     * Update the value of this shared reference only if it changed.
     * @param {*} newVal
     */
    setValueIfChanged(newVal : T) : void {
      if (newVal !== value) {
        this.setValue(newVal);
      }
    },

    /**
     * Returns an Observable which synchronously emits the current value (unless
     * the `skipCurrentValue` argument has been set to `true`) and then each
     * time a new value is set.
     * @param {boolean} [skipCurrentValue]
     * @returns {Observable}
     */
    asObservable(skipCurrentValue? : boolean) : Observable<T> {
      return new Observable((obs : Subscriber<T>) => {
        if (skipCurrentValue !== true) {
          obs.next(value);
        }
        if (isFinished) {
          obs.complete();
          return undefined;
        }
        const cbObj = { trigger: obs.next.bind(obs),
                        complete: obs.complete.bind(obs),
                        hasBeenCleared: false };
        cbs.push(cbObj);
        return () => {
          /**
           * Code in here can still be running while this is happening.
           * Set `hasBeenCleared` to `true` to avoid still using the
           * `subscriber` from this object.
           */
          cbObj.hasBeenCleared = true;
          const indexOf = cbs.indexOf(cbObj);
          if (indexOf >= 0) {
            cbs.splice(indexOf, 1);
          }
        };
      });
    },

    /**
     * Allows to register a callback to be called each time the value inside the
     * reference is updated.
     * @param {Function} cb - Callback to be called each time the reference is
     * updated. Takes the new value im argument.
     * @param {Object|undefined} [options]
     * @param {Object|undefined} [options.clearSignal] - Allows to provide a
     * CancellationSignal which will unregister the callback when it emits.
     * @param {boolean|undefined} [options.emitCurrentValue] - If `true`, the
     * callback will also be immediately called with the current value.
     */
    onUpdate(
      cb : (val : T) => void,
      options? : {
        clearSignal?: CancellationSignal | undefined;
        emitCurrentValue?: boolean | undefined;
      } | undefined
    ) : void {
      if (options?.emitCurrentValue === true) {
        cb(value);
      }
      if (isFinished) {
        return ;
      }
      const cbObj = { trigger: cb,
                      complete: unlisten,
                      hasBeenCleared: false };
      cbs.push(cbObj);
      if (options?.clearSignal === undefined) {
        return;
      }
      options.clearSignal.register(unlisten);

      function unlisten() : void {
        /**
         * Code in here can still be running while this is happening.
         * Set `hasBeenCleared` to `true` to avoid still using the
         * `subscriber` from this object.
         */
        cbObj.hasBeenCleared = true;
        const indexOf = cbs.indexOf(cbObj);
        if (indexOf >= 0) {
          cbs.splice(indexOf, 1);
        }
      }
    },

    /**
     * Indicate that no new values will be emitted.
     * Allows to automatically close all Observables generated from this shared
     * reference.
     */
    finish() : void {
      isFinished = true;
      const clonedCbs = cbs.slice();
      for (const cbObj of clonedCbs) {
        try {
          if (!cbObj.hasBeenCleared) {
            cbObj.complete();
          }
          cbObj.hasBeenCleared = true;
        } catch (_) {
          /* nothing */
        }
      }
      cbs.length = 0;
    },
  };
}

/**
 * Create a new `ISharedReference` based on another one by mapping over its
 * referenced value each time it is updated.
 * @param {Object} originalRef - The Original `ISharedReference` you wish to map
 * over.
 * @param {Function} mappingFn - The mapping function which will receives
 * `originalRef`'s value and outputs this new reference's value.
 * @param {Object | undefined} [cancellationSignal] - Optionally, a
 * `CancellationSignal` which will finish that reference when it emits.
 * @returns {Object} - The new, mapped, reference.
 */
export function createMappedReference<T, U>(
  originalRef : IReadOnlySharedReference<T>,
  mappingFn : (x : T) => U,
  cancellationSignal? : CancellationSignal
) : IReadOnlySharedReference<U> {
  const newRef = createSharedReference(mappingFn(originalRef.getValue()));
  originalRef.onUpdate(function mapOriginalReference(x) {
    newRef.setValue(mappingFn(x));
  }, { clearSignal: cancellationSignal });

  // TODO nothing is done if `originalRef` is finished, though the returned
  // reference could also be finished in that case. To do?
  if (cancellationSignal !== undefined) {
    cancellationSignal.register(() => {
      newRef.finish();
    });
  }

  return newRef;
}

export default createSharedReference;
