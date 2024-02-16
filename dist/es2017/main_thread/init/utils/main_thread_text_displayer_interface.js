/**
 * Implementation of an `ITextDisplayerInterface` running in the main
 * thread (so, in the same thread that the `ITextDisplayer`).
 *
 * This is mainly glue code to expose the right types.
 *
 * @class MainThreadTextDisplayerInterface
 */
export default class MainThreadTextDisplayerInterface {
    /**
     * @param {Object} displayer
     */
    constructor(displayer) {
        this._displayer = displayer;
    }
    /**
     * @see ITextDisplayerInterface
     */
    pushTextData(infos) {
        try {
            return Promise.resolve(this._displayer.pushTextData(infos));
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    /**
     * @see ITextDisplayerInterface
     */
    remove(start, end) {
        try {
            return Promise.resolve(this._displayer.removeBuffer(start, end));
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    /**
     * @see ITextDisplayerInterface
     */
    reset() {
        this._displayer.reset();
    }
    /**
     * @see ITextDisplayerInterface
     */
    stop() {
        this._displayer.stop();
    }
}
