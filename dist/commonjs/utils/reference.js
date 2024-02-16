"use strict";
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMappedReference = void 0;
var array_find_index_1 = require("./array_find_index");
var noop_1 = require("./noop");
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
var SharedReference = /** @class */ (function () {
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
    function SharedReference(initialValue, cancelSignal) {
        var _this = this;
        this._value = initialValue;
        this._listeners = [];
        this._isFinished = false;
        this._onFinishCbs = [];
        if (cancelSignal !== undefined) {
            this._deregisterCancellation = cancelSignal.register(function () { return _this.finish(); });
        }
    }
    /**
     * Returns the current value of this shared reference.
     * @returns {*}
     */
    SharedReference.prototype.getValue = function () {
        return this._value;
    };
    /**
     * Update the value of this shared reference.
     * @param {*} newVal
     */
    SharedReference.prototype.setValue = function (newVal) {
        var e_1, _a;
        if (this._isFinished) {
            if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
                /* eslint-disable-next-line no-console */
                console.error("Finished shared references cannot be updated");
            }
            return;
        }
        this._value = newVal;
        if (this._listeners.length === 0) {
            return;
        }
        var clonedCbs = this._listeners.slice();
        try {
            for (var clonedCbs_1 = __values(clonedCbs), clonedCbs_1_1 = clonedCbs_1.next(); !clonedCbs_1_1.done; clonedCbs_1_1 = clonedCbs_1.next()) {
                var cbObj = clonedCbs_1_1.value;
                try {
                    if (!cbObj.hasBeenCleared) {
                        cbObj.trigger(newVal, cbObj.complete);
                    }
                }
                catch (_) {
                    /* nothing */
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (clonedCbs_1_1 && !clonedCbs_1_1.done && (_a = clonedCbs_1.return)) _a.call(clonedCbs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * Update the value of this shared reference only if the value changed.
     *
     * Note that this function only performs a strict equality reference through
     * the "===" operator. Different objects that are structurally the same will
     * thus be considered different.
     * @param {*} newVal
     */
    SharedReference.prototype.setValueIfChanged = function (newVal) {
        if (newVal !== this._value) {
            this.setValue(newVal);
        }
    };
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
    SharedReference.prototype.onUpdate = function (cb, options) {
        var _this = this;
        var unlisten = function () {
            if ((options === null || options === void 0 ? void 0 : options.clearSignal) !== undefined) {
                options.clearSignal.deregister(unlisten);
            }
            if (cbObj.hasBeenCleared) {
                return;
            }
            cbObj.hasBeenCleared = true;
            var indexOf = _this._listeners.indexOf(cbObj);
            if (indexOf >= 0) {
                _this._listeners.splice(indexOf, 1);
            }
        };
        var cbObj = { trigger: cb, complete: unlisten, hasBeenCleared: false };
        this._listeners.push(cbObj);
        if ((options === null || options === void 0 ? void 0 : options.emitCurrentValue) === true) {
            cb(this._value, unlisten);
        }
        if (this._isFinished || cbObj.hasBeenCleared) {
            unlisten();
            return;
        }
        if ((options === null || options === void 0 ? void 0 : options.clearSignal) === undefined) {
            return;
        }
        options.clearSignal.register(unlisten);
    };
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
    SharedReference.prototype.waitUntilDefined = function (cb, options) {
        var _this = this;
        this.onUpdate(function (val, stopListening) {
            if (val !== undefined) {
                stopListening();
                cb(_this._value);
            }
        }, { clearSignal: options === null || options === void 0 ? void 0 : options.clearSignal, emitCurrentValue: true });
    };
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
    SharedReference.prototype._onFinished = function (cb, onFinishCancelSignal) {
        var _this = this;
        if (onFinishCancelSignal.isCancelled()) {
            return noop_1.default;
        }
        var cleanUp = function () {
            var indexOf = (0, array_find_index_1.default)(_this._onFinishCbs, function (x) { return x.trigger === trigger; });
            if (indexOf >= 0) {
                _this._onFinishCbs[indexOf].hasBeenCleared = true;
                _this._onFinishCbs.splice(indexOf, 1);
            }
        };
        var trigger = function () {
            cleanUp();
            cb();
        };
        var deregisterCancellation = onFinishCancelSignal.register(cleanUp);
        this._onFinishCbs.push({ trigger: trigger, hasBeenCleared: false });
        return deregisterCancellation;
    };
    /**
     * Indicate that no new values will be emitted.
     * Allows to automatically free all listeners linked to this reference.
     */
    SharedReference.prototype.finish = function () {
        var e_2, _a, e_3, _b;
        if (this._deregisterCancellation !== undefined) {
            this._deregisterCancellation();
        }
        this._isFinished = true;
        var clonedCbs = this._listeners.slice();
        try {
            for (var clonedCbs_2 = __values(clonedCbs), clonedCbs_2_1 = clonedCbs_2.next(); !clonedCbs_2_1.done; clonedCbs_2_1 = clonedCbs_2.next()) {
                var cbObj = clonedCbs_2_1.value;
                try {
                    if (!cbObj.hasBeenCleared) {
                        cbObj.complete();
                        cbObj.hasBeenCleared = true;
                    }
                }
                catch (_) {
                    /* nothing */
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (clonedCbs_2_1 && !clonedCbs_2_1.done && (_a = clonedCbs_2.return)) _a.call(clonedCbs_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this._listeners.length = 0;
        if (this._onFinishCbs.length > 0) {
            var clonedFinishedCbs = this._onFinishCbs.slice();
            try {
                for (var clonedFinishedCbs_1 = __values(clonedFinishedCbs), clonedFinishedCbs_1_1 = clonedFinishedCbs_1.next(); !clonedFinishedCbs_1_1.done; clonedFinishedCbs_1_1 = clonedFinishedCbs_1.next()) {
                    var cbObj = clonedFinishedCbs_1_1.value;
                    try {
                        if (!cbObj.hasBeenCleared) {
                            cbObj.trigger();
                            cbObj.hasBeenCleared = true;
                        }
                    }
                    catch (_) {
                        /* nothing */
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (clonedFinishedCbs_1_1 && !clonedFinishedCbs_1_1.done && (_b = clonedFinishedCbs_1.return)) _b.call(clonedFinishedCbs_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            this._onFinishCbs.length = 0;
        }
    };
    return SharedReference;
}());
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
function createMappedReference(originalRef, mappingFn, cancellationSignal) {
    var newRef = new SharedReference(mappingFn(originalRef.getValue()), cancellationSignal);
    originalRef.onUpdate(function mapOriginalReference(x) {
        newRef.setValue(mappingFn(x));
    }, { clearSignal: cancellationSignal });
    originalRef._onFinished(function () {
        newRef.finish();
    }, cancellationSignal);
    return newRef;
}
exports.createMappedReference = createMappedReference;
exports.default = SharedReference;
