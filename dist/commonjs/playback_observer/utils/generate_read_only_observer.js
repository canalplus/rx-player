"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Create `IReadOnlyPlaybackObserver` from a source `IReadOnlyPlaybackObserver`
 * and a mapping function.
 * @param {Object} src
 * @param {Function} transform
 * @returns {Object}
 */
function generateReadOnlyObserver(src, transform, cancellationSignal) {
    var mappedRef = transform(src.getReference(), cancellationSignal);
    return {
        getCurrentTime: function () {
            return src.getCurrentTime();
        },
        getReadyState: function () {
            return src.getReadyState();
        },
        getPlaybackRate: function () {
            return src.getPlaybackRate();
        },
        getIsPaused: function () {
            return src.getIsPaused();
        },
        getReference: function () {
            return mappedRef;
        },
        listen: function (cb, options) {
            var _a;
            if (cancellationSignal.isCancelled() ||
                ((_a = options === null || options === void 0 ? void 0 : options.clearSignal) === null || _a === void 0 ? void 0 : _a.isCancelled()) === true) {
                return;
            }
            mappedRef.onUpdate(cb, {
                clearSignal: options === null || options === void 0 ? void 0 : options.clearSignal,
                emitCurrentValue: options === null || options === void 0 ? void 0 : options.includeLastObservation,
            });
        },
        deriveReadOnlyObserver: function (newTransformFn) {
            return generateReadOnlyObserver(this, newTransformFn, cancellationSignal);
        },
    };
}
exports.default = generateReadOnlyObserver;
