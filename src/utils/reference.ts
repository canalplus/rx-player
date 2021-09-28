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
  /** Get the last set value for this shared reference. */
  getValue() : T;

  /** Update the value of this shared reference. */
  setValue(newVal : T) : void;

  /**
   * Returns an Observable which synchronously emits the current value (unless
   * the `skipCurrentValue` argument has been set to `true`) and then each time
   * a new value is set.
   * @param {boolean} [skipCurrentValue]
   * @returns {Observable}
   */
  asObservable(skipCurrentValue? : boolean) : Observable<T>;

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
  getValue() : T;
  asObservable(skipCurrentValue? : boolean) : Observable<T>;
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
   * List of currently subscribed Observables which listen to the referenced
   * value's updates.
   *
   * Contains two properties:
   *   - `subscriber`: interface through which new value will be communicated.
   *   - `hasBeenUnsubscribed`: becomes `true` when the Observable becomes
   *     unsubscribed and thus when it is removed from the `subs` array.
   *     Adding this property allows to detect when a previously-added
   *     Observable has since been unsubscribed e.g. as a side-effect during a
   *     function call.
   */
  const subs : Array<{ subscriber : Subscriber<T>;
                       hasBeenUnsubscribed : boolean; }> = [];

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
     * @param {*}
     */
    setValue(newVal : T) : void {
      if (isFinished) {
        throw new Error("Finished shared references cannot be updated");
      }
      value = newVal;

      if (subs.length === 0) {
        return;
      }
      const clonedSubs = subs.slice();
      for (const subObj of clonedSubs) {
        try {
          if (!subObj.hasBeenUnsubscribed) {
            subObj.subscriber.next(newVal);
          }
        } catch (_) {
          /* nothing */
        }
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
        const subObj = { subscriber: obs,
                         hasBeenUnsubscribed: false };
        subs.push(subObj);
        return () => {
          /**
           * Code in here can still be running while this is happening.
           * Set `hasBeenUnsubscribed` to `true` to avoid still using the
           * `subscriber` from this object.
           */
          subObj.hasBeenUnsubscribed = true;
          const indexOf = subs.indexOf(subObj);
          if (indexOf >= 0) {
            subs.splice(indexOf, 1);
          }
        };
      });
    },

    /**
     * Indicate that no new values will be emitted.
     * Allows to automatically close all Observables generated from this shared
     * reference.
     */
    finish() : void {
      isFinished = true;
      const clonedSubs = subs.slice();
      for (const subObj of clonedSubs) {
        try {
          if (!subObj.hasBeenUnsubscribed) {
            subObj.subscriber.complete();
          }
        } catch (_) {
          /* nothing */
        }
      }
    },
  };
}

export default createSharedReference;
