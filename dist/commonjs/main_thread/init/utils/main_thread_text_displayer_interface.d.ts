import type { ITextDisplayerInterface } from "../../../core/types";
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
    private _displayer;
    /**
     * @param {Object} displayer
     */
    constructor(displayer: ITextDisplayer);
    /**
     * @see ITextDisplayerInterface
     */
    pushTextData(infos: ITextDisplayerData): Promise<IRange[]>;
    /**
     * @see ITextDisplayerInterface
     */
    remove(start: number, end: number): Promise<IRange[]>;
    /**
     * @see ITextDisplayerInterface
     */
    reset(): void;
    /**
     * @see ITextDisplayerInterface
     */
    stop(): void;
}
