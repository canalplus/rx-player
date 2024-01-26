export default typeof queueMicrotask === "function"
  ? queueMicrotask
  : function queueMicrotaskPonyfill(cb: () => void): void {
      Promise.resolve().then(cb, () => cb());
    };
