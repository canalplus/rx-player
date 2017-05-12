const { Observable } = require("rxjs/Observable");
const { merge } = require("rxjs/observable/merge");
const fromEvent = require("rxjs/observable/FromEventObservable").FromEventObservable.create;
const fromPromise = require("rxjs/observable/PromiseObservable").PromiseObservable.create;

function on(elt, evts) {
  if (Array.isArray(evts)) {
    return merge.apply(null, evts.map((evt) => fromEvent(elt, evt)));
  } else {
    return fromEvent(elt, evts);
  }
}


function castToObservable(value) {
  if (value instanceof Observable) {
    return value;
  }

  if (value && typeof value.subscribe == "function") {
    return new Observable((obs) => {
      const sub = value.subscribe(
        (val) => obs.next(val),
        (err) => obs.error(err),
        ()    => obs.complete()
      );

      return () => {
        if (sub && sub.dispose) {
          sub.dispose();
        }
        else if (sub && sub.unsubscribe) {
          sub.unsubscribe();
        }
      };
    });
  }

  if (value && typeof value.then == "function") {
    return fromPromise(value);
  }

  return Observable.of(value);
}


class OnlyObservable extends Observable {
  constructor(value) {
    super();
    this.value = value;
  }
  _subscribe(subscriber) {
    subscriber.next(this.value);
  }
}

function only(value) {
  return new OnlyObservable(value);
}


function tryCatch(func, args) {
  try {
    return func(args);
  } catch(e) {
    return Observable.throw(e);
  }
}

module.exports = {
  on,
  only,
  tryCatch,
  castToObservable,
};
