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
import type { CancellationSignal } from "./task_canceller";
/**
 * A value behind a shared reference, meaning that any update to its value from
 * anywhere can be retrieved from any other parts of the code in possession of
 * the same `SharedReference`.
 *
 * @example
 * ```ts
 * const myVal = 1;
 * const myRef : SharedReference<number> = new SharedReference(1);
 *
 * function setValTo2(num : number) {
 *   num = 2;
 * }
 *
 * function setRefTo2(num : SharedReference<number>) {
 *   num.setValue(2);
 * }
 *
 * setValTo2(myVal);
 * console.log(myVal); // output: 1
 *
 * myRef.onUpdate((val) => {
 *   console.log(val); // outputs first synchronously `1`, then `2`
 * }, { emitCurrentValue: true });
 *
 * setRefTo2(myRef);
 * console.log(myRef.getValue()); // output: 2
 *
 * myRef.listen((val) => {
 *   console.log(val); // outputs only `2`
 * }, { emitCurrentValue: true });
 * ```
 *
 * This type was added because we found that the usage of an explicit type for
 * those use cases makes the intent of the corresponding code clearer.
 */
declare class SharedReference<T> {
    /** Current value referenced by this `SharedReference`. */
    private _value;
    /**
     * Attributes each linked to a single registered callbacks which listen to the
     * referenced value's updates.
     *
     * Contains the following properties:
     *   - `trigger`: Function which will be called with the new reference's value
     *     once it changes
     *   - `complete`: Allows to clean-up the listener, will be called once the
     *     reference is finished.
     *   - `hasBeenCleared`: becomes `true` when the reference is
     *     removed from the `cbs` array.
     *     Adding this property allows to detect when a previously-added
     *     listener has since been removed e.g. as a side-effect during a
     *     function call.
     *   - `complete`: Callback to call when the current Reference is "finished".
     */
    private _listeners;
    /**
     * Set to `true` when this `SharedReference` is finished in which case it
     * cannot be updated nor emit values anymore.
     */
    private _isFinished;
    /**
     * Callbacks triggered when the `SharedReference` is finished.
     */
    private _onFinishCbs;
    /**
     * Store a reference to the callback allowing to finish the `SharedReference`
     * on some event. Allows to remove the logic when it's not needed anymore.
     */
    private _deregisterCancellation;
    /**
     * Create a `SharedReference` object encapsulating the mutable `initialValue`
     * value of type T.
     * @param {*} initialValue
     * @param {Object|undefined} [cancelSignal] - If set, the created shared
     * reference will be automatically "finished" once that signal emits.
     * Finished references won't be able to update their value anymore, and will
     * also automatically have their listeners (callbacks linked to value change)
     * removed - as they cannot be triggered anymore, thus providing a security
     * against memory leaks.
     */
    constructor(initialValue: T, cancelSignal?: CancellationSignal);
    /**
     * Returns the current value of this shared reference.
     * @returns {*}
     */
    getValue(): T;
    /**
     * Update the value of this shared reference.
     * @param {*} newVal
     */
    setValue(newVal: T): void;
    /**
     * Update the value of this shared reference only if the value changed.
     *
     * Note that this function only performs a strict equality reference through
     * the "===" operator. Different objects that are structurally the same will
     * thus be considered different.
     * @param {*} newVal
     */
    setValueIfChanged(newVal: T): void;
    /**
     * Allows to register a callback to be called each time the value inside the
     * reference is updated.
     * @param {Function} cb - Callback to be called each time the reference is
     * updated. Takes as first argument its new value and in second argument a
     * callback allowing to unregister the callback.
     * @param {Object|undefined} [options]
     * @param {Object|undefined} [options.clearSignal] - Allows to provide a
     * CancellationSignal which will unregister the callback when it emits.
     * @param {boolean|undefined} [options.emitCurrentValue] - If `true`, the
     * callback will also be immediately called with the current value.
     */
    onUpdate(cb: (val: T, stopListening: () => void) => void, options?: {
        clearSignal?: CancellationSignal | undefined;
        emitCurrentValue?: boolean | undefined;
    } | undefined): void;
    /**
     * Variant of `onUpdate` which will only call the callback once, once the
     * value inside the reference is different from `undefined`.
     * The callback is called synchronously if the value already isn't set to
     * `undefined`.
     *
     * This method can be used as a lighter weight alternative to `onUpdate` when
     * just waiting that the stored value becomes defined.
     * As such, it is an explicit equivalent to something like:
     * ```js
     * myReference.onUpdate((newVal, stopListening) => {
     *  if (newVal !== undefined) {
     *    stopListening();
     *
     *    // ... do the logic
     *  }
     * }, { emitCurrentValue: true });
     * ```
     * @param {Function} cb - Callback to be called each time the reference is
     * updated. Takes the new value in argument.
     * @param {Object | undefined} [options]
     * @param {Object | undefined} [options.clearSignal] - Allows to provide a
     * CancellationSignal which will unregister the callback when it emits.
     */
    waitUntilDefined(cb: (val: Exclude<T, undefined>) => void, options?: {
        clearSignal?: CancellationSignal | undefined;
    } | undefined): void;
    /**
     * Allows to register a callback for when the Shared Reference is "finished".
     *
     * This function is mostly there for implementing operators on the shared
     * reference and isn't meant to be used by regular code, hence it being
     * prefixed by `_`.
     * @param {Function} cb - Callback to be called once the reference is
     * finished.
     * @param {Object} onFinishCancelSignal - Allows to provide a
     * CancellationSignal which will unregister the callback when it emits.
     */
    _onFinished(cb: () => void, onFinishCancelSignal: CancellationSignal): () => void;
    /**
     * Indicate that no new values will be emitted.
     * Allows to automatically free all listeners linked to this reference.
     */
    finish(): void;
}
/**
 * A `SharedReference` which can only be read and not updated.
 *
 * Because a `SharedReference` is structurally compatible to a
 * `IReadOnlySharedReference`, and because of TypeScript variance rules, it can
 * be upcasted into a `IReadOnlySharedReference` at any time to make it clear in
 * the code that some logic is not supposed to update the referenced value.
 *
 * @example
 * ```ts
 * const myReference : SharedReference<number> = new SharedReference(4);
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
 */
export type IReadOnlySharedReference<T> = Pick<SharedReference<T>, "getValue" | "onUpdate" | "waitUntilDefined" | "_onFinished">;
/**
 * Create a new `SharedReference` based on another one by mapping over its
 * referenced value each time it is updated and finishing once it finishes.
 * @param {Object} originalRef - The Original `SharedReference` you wish to map
 * over.
 * @param {Function} mappingFn - The mapping function which will receives
 * `originalRef`'s value and outputs this new reference's value.
 * @param {Object} cancellationSignal - Optionally, a `CancellationSignal` which
 * will finish that reference when it emits.
 * @returns {Object} - The new, mapped, reference.
 */
export declare function createMappedReference<T, U>(originalRef: IReadOnlySharedReference<T>, mappingFn: (x: T) => U, cancellationSignal: CancellationSignal): IReadOnlySharedReference<U>;
export default SharedReference;
//# sourceMappingURL=reference.d.ts.map