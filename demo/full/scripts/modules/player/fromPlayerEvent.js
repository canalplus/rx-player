import { Observable } from "rxjs";

/**
 * Simple utils converting an Event-listener-based player event into an
 * Observable.
 * @param {RxPlayer} player
 * @param {string} event
 * @returns {Observable}
 */
export default function fromPlayerEvent(player, event) {
  return new Observable(obs => {
    const func = (payload) => obs.next(payload);
    player.addEventListener(event, func);

    return () => {
      player.removeEventListener(event, func);
    };
  });
}
