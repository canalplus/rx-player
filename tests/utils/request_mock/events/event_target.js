function flattenOptions(options) {
  if (options !== Object(options)) {
    return { capture: Boolean(options), once: false, passive: false };
  }
  return {
    capture: Boolean(options.capture),
    once: Boolean(options.once),
    passive: Boolean(options.passive),
  };
}

function not(fn) {
  return function () {
    return !fn.apply(this, arguments);
  };
}

function hasListenerFilter(listener, capture) {
  return function (listenerSpec) {
    return listenerSpec.capture === capture && listenerSpec.listener === listener;
  };
}

const EventTarget = {
  // https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener
  addEventListener(event, listener, providedOptions) {
    const options = flattenOptions(providedOptions);

    if (listener == null) {
      return;
    }

    this._listeners = this._listeners || {};
    this._listeners[event] = this._listeners[event] || [];

    // 4. If context object’s associated list of event listener
    //    does not contain an event listener whose type is type,
    //    callback is callback, and capture is capture, then append
    //    a new event listener to it, whose type is type, callback is
    //    callback, capture is capture, passive is passive, and once is once.
    if (!this._listeners[event].some(hasListenerFilter(listener, options.capture))) {
      this._listeners[event].push({
        listener: listener,
        capture: options.capture,
        once: options.once,
      });
    }
  },

  // https://dom.spec.whatwg.org/#dom-eventtarget-removeeventlistener
  removeEventListener: function removeEventListener(event, listener, providedOptions) {
    if (!this._listeners || !this._listeners[event]) {
      return;
    }

    const options = flattenOptions(providedOptions);

    this._listeners[event] = this._listeners[event].filter(
      not(hasListenerFilter(listener, options.capture)),
    );
  },

  dispatchEvent: function dispatchEvent(event) {
    if (!this._listeners || !this._listeners[event.type]) {
      return Boolean(event.defaultPrevented);
    }

    const type = event.type;
    const listeners = this._listeners[type];

    // Remove listeners, that should be dispatched once
    // before running dispatch loop to avoid nested dispatch issues
    this._listeners[type] = listeners.filter(function (listenerSpec) {
      return !listenerSpec.once;
    });
    listeners.forEach((listenerSpec) => {
      const { listener } = listenerSpec;
      if (typeof listener === "function") {
        listener.call(this, event);
      } else {
        listener.handleEvent(event);
      }
    });

    return Boolean(event.defaultPrevented);
  },
};

export default EventTarget;
