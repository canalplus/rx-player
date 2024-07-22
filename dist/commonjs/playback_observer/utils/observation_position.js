"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Class facilitating the exploitation of what could be called the "playback
 * position" (the position at which we should currently be playing).
 *
 * In appearance a simple concept, it has in reality some gotchas that we wanted
 * to make more explicit.
 * As such, this class defines multiple methods to obtain an estimate of it,
 * each having its own pros and cons.
 *
 * @class ObservationPosition
 */
var ObservationPosition = /** @class */ (function () {
    function ObservationPosition(last, wanted) {
        this._last = last;
        this._wanted = wanted;
    }
    /**
     * Obtain arguments allowing to instanciate the same ObservationPosition.
     *
     * This can be used to create a new `ObservationPosition` across JS realms,
     * generally to communicate its data between the main thread and a WebWorker.
     * @returns {Array.<number>}
     */
    ObservationPosition.prototype.serialize = function () {
        return [this._last, this._wanted];
    };
    /**
     * Returns the playback position actually observed on the media element at
     * the time the playback observation was made.
     *
     * Note that it may be different than the position for which media data is
     * wanted in rare scenarios where the goal position is not yet set on the
     * media element.
     *
     * You should use this value when you want to obtain the actual position set
     * on the media element for browser compatibility purposes. Note that this
     * position was calculated at observation time, it might thus not be
     * up-to-date if what you want is milliseconds-accuracy.
     *
     * If what you want is the actual position which the player is intended to
     * play, you should rely on `getWanted` instead`.
     * @returns {number}
     */
    ObservationPosition.prototype.getPolled = function () {
        return this._last;
    };
    /**
     * Returns the position which the player should consider to load media data
     * at the time the observation was made.
     *
     * It can be different than the value returned by `getPolled` in rare
     * scenarios:
     *
     *   - When the initial position has not been set yet.
     *
     *   - When the current device do not let the RxPlayer peform precize seeks,
     *     usually for perfomance reasons by seeking to a previous IDR frame
     *     instead (for now only Tizen may be like this), in which case we
     *     prefer to generally rely on the position wanted by the player (this
     *     e.g. prevents issues where the RxPlayer logic and the device are
     *     seeking back and forth in a loop).
     *
     *   - When a wanted position has been "forced" (@see forceWantedPosition).
     * @returns {number}
     */
    ObservationPosition.prototype.getWanted = function () {
        var _a;
        return (_a = this._wanted) !== null && _a !== void 0 ? _a : this._last;
    };
    /**
     * Method to call if you want to overwrite the currently wanted position.
     * @param {number} pos
     */
    ObservationPosition.prototype.forceWantedPosition = function (pos) {
        this._wanted = pos;
    };
    /**
     * Returns `true` when the position wanted returned by `getWanted` and the
     * actual position returned by `getPolled` may be different, meaning that
     * we're currently not at the position we want to reach.
     *
     * This is a relatively rare situation which only happens when either the
     * initial seek has not yet been performed. on specific targets where the
     * seeking behavior is a little broken (@see getWanted) or when the wanted
     * position has been forced (@see forceWantedPosition).
     *
     * In those situations, you might temporarily refrain from acting upon the
     * actual current media position, as it may change soon.
     *
     * @returns {boolean}
     */
    ObservationPosition.prototype.isAwaitingFuturePosition = function () {
        return this._wanted !== null;
    };
    return ObservationPosition;
}());
exports.default = ObservationPosition;
