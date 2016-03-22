const { Observable } = require("rxjs/Observable");
const { mergeStatic } = require("rxjs/operator/merge");
const fromEvent = require("rxjs/observable/FromEventObservable").FromEventObservable.create;
const fromPromise = require("rxjs/observable/PromiseObservable").PromiseObservable.create;
const never = require("rxjs/observable/NeverObservable").NeverObservable.create;

function on(elt, evts) {
  if (Array.isArray(evts)) {
    return mergeStatic.apply(null, evts.map((evt) => fromEvent(elt, evt)));
  } else {
    return fromEvent(elt, evts);
  }
}


function castToObservable(value) {
  if (value && typeof value.subscribe == "function") {
    if (value instanceof Observable) {
      return value;
    } else {
      return new Observable((obs) => value.subscribe(obs));
    }
  }

  if (value && typeof value.then == "function") {
    return fromPromise(value);
  }

  return Observable.of(value);
}

function only(x) {
  return never().startWith(x);
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
