"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var object_assign_1 = require("./object_assign");
/**
 * Check if an item is an object
 * @param item
 * @returns {boolean}
 */
function isObject(item) {
    return (item !== null &&
        item !== undefined &&
        !Array.isArray(item) &&
        typeof item === "object");
}
/**
 * Deeply merge nested objects
 * @param target
 * @param sources
 * @returns output : merged object
 */
function deepMerge(target) {
    var _a;
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    if (sources.length === 0) {
        return target;
    }
    var source = sources.shift();
    if (isObject(target) && isObject(source)) {
        for (var key in source) {
            if (isObject(source[key])) {
                var newTarget = target[key];
                if (newTarget === undefined) {
                    newTarget = {};
                    target[key] = newTarget;
                }
                deepMerge(newTarget, source[key]);
            }
            else {
                (0, object_assign_1.default)(target, (_a = {}, _a[key] = source[key], _a));
            }
        }
    }
    return deepMerge.apply(void 0, __spreadArray([target], __read(sources), false));
}
exports.default = deepMerge;
