export default typeof queueMicrotask === "function"
    ? queueMicrotask
    : function queueMicrotaskPonyfill(cb) {
        Promise.resolve().then(cb, () => cb());
    };
