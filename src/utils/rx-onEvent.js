import { Observable } from "rxjs/Observable";

/**
 * Returns a fromEvent on the given element for the given event(s).
 * @param {Element}
 * @param {Array.<string>|string}
 * @returns {Observable}
 */
export default function onEvent(elt, evts) {
  if (Array.isArray(evts)) {
    return Observable.merge
      .apply(null, evts.map((evt) => Observable.fromEvent(elt, evt)));
  } else {
    return Observable.fromEvent(elt, evts);
  }
}
