const { mergeStatic } = require("rxjs/operator/merge");
const fromEvent = require("rxjs/observable/FromEventObservable").FromEventObservable.create;
const never = require("rxjs/observable/NeverObservable").NeverObservable.create;

function on(elt, evts) {
  if (Array.isArray(evts)) {
    return mergeStatic.apply(null, evts.map((evt) => fromEvent(elt, evt)));
  } else {
    return fromEvent(elt, evts);
  }
}

function only(x) {
  return never().startWith(x);
}

module.exports = {
  on,
  only,
};
