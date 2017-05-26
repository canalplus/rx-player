import { Observable } from "rxjs/Observable";
import { merge } from "rxjs/observable/merge";
import { FromEventObservable } from "rxjs/observable/FromEventObservable";
import { PromiseObservable } from "rxjs/observable/PromiseObservable";

const fromEvent = FromEventObservable.create;
const fromPromise = PromiseObservable.create;

/**
 * Returns a fromEvent on the given element for the given event(s).
 * @param {Element}
 * @param {Array.<string>|string}
 * @returns {Observable}
 */
function on(elt, evts) {
  if (Array.isArray(evts)) {
    return merge.apply(null, evts.map((evt) => fromEvent(elt, evt)));
  } else {
    return fromEvent(elt, evts);
  }
}


/**
 * Try to cast the given value into an observable.
 * StraightForward - test first for an Observable then for a Promise.
 * @param {Observable|Function|*}
 * @returns {Observable}
 */
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


/**
 * Observable which emit on subscribe a single value (given to constructor)
 * and never completes / fails.
 * TODO Delete? see _only_ function
 * @class OnlyObservable
 */
class OnlyObservable extends Observable {
  constructor(value) {
    super();
    this.value = value;
  }
  _subscribe(subscriber) {
    subscriber.next(this.value);
  }
}

/**
 * Returns an OnlyObservable with the given value.
 * TODO replace with Observable.never().startWith(value)?
 * @param {*} value
 * @returns {Observable}
 */
function only(value) {
  return new OnlyObservable(value);
}

/**
 * @param {Function} func - A function you want to execute
 * @param {*} args - The function's argument
 * @returns {*} - If it fails, returns a throwing Observable, else the
 * function's result (which should be, in most cases, an Observable).
 */
function tryCatch(func, args) {
  try {
    return func(args);
  } catch(e) {
    return Observable.throw(e);
  }
}

/**
 * Throttle an asynchronous function (returning an Observable or Promise) to
 * drop calls done before a previous one has finished or failed.
 *
 * @example
 * ```js
 * const fn = (time) => Observable.timer(time);
 * const throttled = throttle(fn);
 *
 * const Obs1 = throttled(2000); // -> call fn(2000) and returns its Observable
 * const Obs2 = throttled(1000); // -> won't do anything, Obs2 is an empty
 *                               //    observable (it directly completes)
 * setTimeout(() => {
 *   const Obs3 = throttled(1000); // -> will call fn(1000)
 * }, 2001);
 * ```
 *
 * @param {Function} func
 * @returns {Function} - Function taking in argument the arguments you want
 * to give your function, and returning an Observable.
 */
const throttle = (func) => {
  let isPending = false;

  return (...args) => {
    if (isPending) {
      return Observable.empty();
    }

    isPending = true;
    return castToObservable(func(...args))
      .do(
        null,
        () => isPending = false,
        () => isPending = false
      );
  };
};

export {
  on,
  only,
  tryCatch,
  castToObservable,
  throttle,
};
