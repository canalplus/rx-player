import type { IBufferedChunk } from "../../../core/types";
export interface ISegmentSinkGrapUpdateData {
    currentTime: number;
    inventory: IBufferedChunk[];
    width: number;
    height: number;
    minimumPosition: number | undefined;
    maximumPosition: number | undefined;
}
export default class SegmentSinkGraph {
    /** Link buffered Representation to their corresponding color. */
    private readonly _colorMap;
    /** Current amount of colors chosen to represent the various Representation. */
    private _currNbColors;
    /** Canvas that will contain the buffer graph itself. */
    private readonly _canvasElt;
    private readonly _canvasCtxt;
    constructor(canvasElt: HTMLCanvasElement);
    clear(): void;
    update(data: ISegmentSinkGrapUpdateData): void;
    /**
     * Paint a given range in the canvas
     * @param {Object} rangeScaled - Buffered segment information with added
     * "scaling" information to know where it fits in the canvas.
     */
    private _paintRange;
    private _getColorForRepresentation;
}
