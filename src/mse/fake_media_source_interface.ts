import log from "../log";
import EventEmitter from "../utils/event_emitter";
import type {
  IMediaSourceInterface,
  IMediaSourceInterfaceEvents,
  ISourceBufferInterface,
  SourceBufferType,
} from "./types";

export default class FakeMediaSourceInterface
  extends EventEmitter<IMediaSourceInterfaceEvents>
  implements IMediaSourceInterface
{
  /** @see IMediaSourceInterface */
  public id: string;
  /** @see IMediaSourceInterface */
  public handle: undefined;
  /** @see IMediaSourceInterface */
  public sourceBuffers: FakeSourceBufferInterface[];
  /** @see IMediaSourceInterface */
  public readyState: "open" | "closed" | "ended";
  private _sourceBuffersList: Array<{
    type: string;
    codec: string;
    sourceBuffer: FakeSourceBufferInterface;
  }>;

  /**
   * Creates a new `FakeMediaSourceInterface` alongside its `MediaSource` MSE
   * object.
   *
   * You can then obtain a link to that `MediaSource`, for example to link it
   * to an `HTMLMediaElement`, through the `handle` property.
   *
   * @param {string} id
   */
  constructor(id: string) {
    super();
    this.id = id;
    this.sourceBuffers = [];
    this.handle = undefined;
    this.readyState = "closed";
    this._sourceBuffersList = [];
  }

  /** @see IMediaSourceInterface */
  public addSourceBuffer(
    sbType: SourceBufferType,
    codec: string,
  ): FakeSourceBufferInterface {
    const sb = new FakeSourceBufferInterface(sbType, codec);
    this.sourceBuffers.push(sb);
    this._sourceBuffersList.push({
      type: sbType,
      codec,
      sourceBuffer: sb,
    });
    this.sourceBuffers.push(sb);
    return sb;
  }

  /** @see IMediaSourceInterface */
  public setDuration(_newDuration: number, _isRealEndKnown: boolean): void {
    // noop
  }

  /** @see IMediaSourceInterface */
  public interruptDurationSetting() {
    // noop
  }

  /** @see IMediaSourceInterface */
  public maintainEndOfStream() {
    // noop
  }

  /** @see IMediaSourceInterface */
  public stopEndOfStream() {
    // noop
  }

  /** @see IMediaSourceInterface */
  public dispose() {
    this.sourceBuffers.forEach((s) => s.dispose());
    this._sourceBuffersList = [];
  }
}

/**
 * Enum used by a `FakeSourceBufferInterface` as a discriminant in its queue of
 * "operations".
 */
export const enum FakeSourceBufferInterfaceOperationName {
  Push,
  Remove,
}

export interface IFakeSourceBufferBufferedOperationPush {
  operationName: FakeSourceBufferInterfaceOperationName.Push;
  params: Parameters<ISourceBufferInterface["appendBuffer"]>;
}

export interface IFakeSourceBufferBufferedOperationRemove {
  operationName: FakeSourceBufferInterfaceOperationName.Remove;
  params: Parameters<ISourceBufferInterface["remove"]>;
}

export type IFakeSourceBufferBufferedOperation =
  | IFakeSourceBufferBufferedOperationPush
  | IFakeSourceBufferBufferedOperationRemove;

/**
 * `ISourceBufferInterface` object for when the MSE API are directly available.
 * @see ISourceBufferInterface
 * @class {FakeSourceBufferInterface}
 */
export class FakeSourceBufferInterface implements ISourceBufferInterface {
  /** @see ISourceBufferInterface */
  public codec: string;
  /** @see ISourceBufferInterface */
  public type: SourceBufferType;

  public buffer: IFakeSourceBufferBufferedOperation[];

  /**
   * Creates a new `SourceBufferInterface` linked to the given `SourceBuffer`
   * instance.
   * @param {string} sbType
   * @param {string} codec
   */
  constructor(sbType: SourceBufferType, codec: string) {
    this.type = sbType;
    this.codec = codec;
    this.buffer = [];
  }

  /** @see ISourceBufferInterface */
  public appendBuffer(
    ...args: Parameters<ISourceBufferInterface["appendBuffer"]>
  ): Promise<undefined> {
    log.debug("FSBI: receiving order to push data to the SourceBuffer", this.type);
    return new Promise((resolve) => {
      this.buffer.push({
        operationName: FakeSourceBufferInterfaceOperationName.Push,
        params: args,
      });
      resolve(undefined);
    });
  }

  /** @see ISourceBufferInterface */
  public remove(
    ...args: Parameters<ISourceBufferInterface["remove"]>
  ): Promise<undefined> {
    log.debug(
      "FSBI: receiving order to remove data from the SourceBuffer",
      this.type,
      args[0],
      args[1],
    );
    return new Promise((resolve) => {
      this.buffer.push({
        operationName: FakeSourceBufferInterfaceOperationName.Remove,
        params: args,
      });
      resolve(undefined);
    });
  }

  /** @see ISourceBufferInterface */
  public getBuffered(): undefined {
    return;
  }

  /** @see ISourceBufferInterface */
  public abort(): void {
    // noop;
  }

  /** @see ISourceBufferInterface */
  public dispose(): void {
    this.buffer = [];
  }
}
