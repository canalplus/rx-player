import type { ITextDisplayerInterface } from "../../../core/segment_sinks";
import type { IRange } from "../../../utils/ranges";
import type { ITextDisplayer, ITextDisplayerData } from "../../text_displayer";

/**
 * Implementation of an `ITextDisplayerInterface` running in the main
 * thread (so, in the same thread that the `ITextDisplayer`).
 *
 * This is mainly glue code to expose the right types.
 *
 * @class MainThreadTextDisplayerInterface
 */
export default class MainThreadTextDisplayerInterface implements ITextDisplayerInterface {
  /** `ITextDisplayer` to which we will be following API calls. */
  private _displayer : ITextDisplayer;

  /**
   * @param {Object} displayer
   */
  constructor(displayer : ITextDisplayer) {
    this._displayer = displayer;
  }

  /**
   * @see ITextDisplayerInterface
   */
  public pushTextData(infos: ITextDisplayerData): Promise<IRange[]> {
    try {
      return Promise.resolve(this._displayer.pushTextData(infos));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * @see ITextDisplayerInterface
   */
  public remove(start: number, end: number): Promise<IRange[]> {
    try {
      return Promise.resolve(this._displayer.removeBuffer(start, end));
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * @see ITextDisplayerInterface
   */
  public reset(): void {
    this._displayer.reset();
  }

  /**
   * @see ITextDisplayerInterface
   */
  public stop(): void {
    this._displayer.stop();
  }
}
