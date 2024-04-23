export default class BufferSizeGraph {
    private _history;
    /** Canvas that will contain the buffer size graph itself. */
    private readonly _canvasElt;
    private readonly _canvasCtxt;
    constructor(canvasElt: HTMLCanvasElement);
    pushBufferSize(bufferSize: number): void;
    clear(): void;
    reRender(width: number, height: number): void;
}
