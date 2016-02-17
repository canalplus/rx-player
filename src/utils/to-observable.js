const { Observable } = require("rxjs/Observable");
const fromPromise = require("rxjs/observable/PromiseObservable").PromiseObservable.create;

function castToObservable(value) {
  if (value && typeof value.subscribe == "function") {
    return value;
  }

  if (value && typeof value.then == "function") {
    return fromPromise(value);
  }

  return Observable.of(value);
}

module.exports = castToObservable;
