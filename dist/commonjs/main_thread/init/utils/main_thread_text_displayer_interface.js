"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Implementation of an `ITextDisplayerInterface` running in the main
 * thread (so, in the same thread that the `ITextDisplayer`).
 *
 * This is mainly glue code to expose the right types.
 *
 * @class MainThreadTextDisplayerInterface
 */
var MainThreadTextDisplayerInterface = /** @class */ (function () {
    /**
     * @param {Object} displayer
     */
    function MainThreadTextDisplayerInterface(displayer) {
        this._displayer = displayer;
    }
    /**
     * @see ITextDisplayerInterface
     */
    MainThreadTextDisplayerInterface.prototype.pushTextData = function (infos) {
        try {
            return Promise.resolve(this._displayer.pushTextData(infos));
        }
        catch (err) {
            return Promise.reject(err);
        }
    };
    /**
     * @see ITextDisplayerInterface
     */
    MainThreadTextDisplayerInterface.prototype.remove = function (start, end) {
        try {
            return Promise.resolve(this._displayer.removeBuffer(start, end));
        }
        catch (err) {
            return Promise.reject(err);
        }
    };
    /**
     * @see ITextDisplayerInterface
     */
    MainThreadTextDisplayerInterface.prototype.reset = function () {
        this._displayer.reset();
    };
    /**
     * @see ITextDisplayerInterface
     */
    MainThreadTextDisplayerInterface.prototype.stop = function () {
        this._displayer.stop();
    };
    return MainThreadTextDisplayerInterface;
}());
exports.default = MainThreadTextDisplayerInterface;
