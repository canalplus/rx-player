/**
 * Create `IReadOnlyPlaybackObserver` from a source `IReadOnlyPlaybackObserver`
 * and a mapping function.
 * @param {Object} src
 * @param {Function} transform
 * @returns {Object}
 */
export default function generateReadOnlyObserver(src, transform, cancellationSignal) {
    const mappedRef = transform(src.getReference(), cancellationSignal);
    return {
        getCurrentTime() {
            return src.getCurrentTime();
        },
        getReadyState() {
            return src.getReadyState();
        },
        getPlaybackRate() {
            return src.getPlaybackRate();
        },
        getIsPaused() {
            return src.getIsPaused();
        },
        getReference() {
            return mappedRef;
        },
        listen(cb, options) {
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
        deriveReadOnlyObserver(newTransformFn) {
            return generateReadOnlyObserver(this, newTransformFn, cancellationSignal);
        },
    };
}
