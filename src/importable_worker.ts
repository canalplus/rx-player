import { CoreMessageType } from "./core/types";
import type { IFeature } from "./features";
import { addFeatures } from "./features";
import initializeWorker from "./initialize_worker";
import logger from "./log";
import { type IMainThreadMessage, MainThreadMessageType } from "./main_thread/types";
import type {
  IManifestLoader,
  IRepresentationFilter,
  ISegmentLoader,
} from "./public_types";
import globalScope from "./utils/global_scope";

let isInitialized = false;

type IEventRecord<TEventName extends string = string, P = unknown> = Record<
  TEventName,
  P
>;

// Type of the argument in the listener's callback
type IEventPayload<
  TEventRecord,
  TEventName extends keyof TEventRecord,
> = TEventRecord[TEventName];

// Type of the listener function
type IListener<
  TEventRecord extends IEventRecord,
  TEventName extends keyof TEventRecord,
> = (args: IEventPayload<TEventRecord, TEventName>) => void;

type IMessageListeners<
  TEventRecord extends IEventRecord,
  P extends keyof TEventRecord = keyof TEventRecord,
> = Map<P, Array<IListener<TEventRecord, P>>>;

export default class RxPlayerWorker<
  TReceivingEventRecord extends IEventRecord = Record<string, unknown>,
  TSendingEventRecord extends IEventRecord = Record<string, unknown>,
> {
  private _messageListeners: IMessageListeners<TReceivingEventRecord>;
  _representationFiltersMap: Map<string, IRepresentationFilter>;
  _segmentLoadersMap: Map<string, ISegmentLoader>;
  _manifestLoadersMap: Map<string, IManifestLoader>;
  /**
   * Add feature(s) to the RxPlayer.
   * @param {Array.<Object>} featureList - Features wanted.
   */
  static addFeatures(featureList: IFeature[]): void {
    addFeatures(featureList);
  }

  constructor() {
    if (isInitialized) {
      throw new Error("You can create only one RxPlayerWorker at most");
    }
    this._representationFiltersMap = new Map();
    this._segmentLoadersMap = new Map();
    this._manifestLoadersMap = new Map();
    isInitialized = true;
    this._messageListeners = new Map();
    globalScope.addEventListener("message", (evt: MessageEvent<IMainThreadMessage>) => {
      if (evt.data.type === MainThreadMessageType.AppDefined) {
        const { name, payload } = evt.data.value;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const listeners = this._messageListeners.get(name as keyof TReceivingEventRecord);
        if (listeners === undefined) {
          return;
        }
        for (const listener of listeners.slice()) {
          try {
            listener(
              payload as IEventPayload<
                TReceivingEventRecord,
                keyof TReceivingEventRecord
              >,
            );
          } catch (err) {
            logger.error(
              "Core",
              "A message listener failed with an error:",
              err instanceof Error ? err : "Unknown Error",
            );
          }
        }
      }
    });
    initializeWorker({
      representationFilters: this._representationFiltersMap,
      segmentLoaders: this._segmentLoadersMap,
      manifestLoaders: this._manifestLoadersMap,
    });
  }

  public registerRepresentationFilter(
    identifier: string,
    implem: IRepresentationFilter | null,
  ): void {
    if (implem === null) {
      this._representationFiltersMap.delete(identifier);
      return;
    }
    this._representationFiltersMap.set(identifier, implem);
  }

  public registerSegmentLoader(identifier: string, implem: ISegmentLoader | null): void {
    if (implem === null) {
      this._segmentLoadersMap.delete(identifier);
      return;
    }
    this._segmentLoadersMap.set(identifier, implem);
  }

  public registerManifestLoader(
    identifier: string,
    implem: IManifestLoader | null,
  ): void {
    if (implem === null) {
      this._manifestLoadersMap.delete(identifier);
      return;
    }
    this._manifestLoadersMap.set(identifier, implem);
  }

  public addMessageListener<TEventName extends keyof TReceivingEventRecord>(
    messageName: TEventName,
    callback: IListener<TReceivingEventRecord, TEventName>,
  ): void {
    const prev = this._messageListeners.get(messageName);
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
    // FIXME: I am not 100% certain why TypeScript is complaining here.
    if (prev === undefined) {
      this._messageListeners.set(messageName, [callback] as any);
    } else {
      this._messageListeners.set(messageName, [...prev, callback] as any);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  public removeMessageListener<TEventName extends keyof TReceivingEventRecord>(
    messageName: TEventName,
    callback: IListener<TReceivingEventRecord, TEventName>,
  ): void {
    const prev = this._messageListeners.get(messageName);
    if (prev === undefined) {
      return;
    }
    while (true) {
      // FIXME: I am not 100% certain why TypeScript is complaining here.
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const indexOf = prev.indexOf(callback as any);
      if (indexOf < 0) {
        return;
      }
      prev.splice(indexOf, 1);
      if (prev.length === 0) {
        this._messageListeners.delete(messageName);
        return;
      }
    }
  }

  public sendMessage<TEventName extends keyof TSendingEventRecord>(
    messageName: TEventName,
    payload: TSendingEventRecord[TEventName],
  ) {
    globalScope.postMessage({
      type: CoreMessageType.AppDefined,
      value: {
        name: messageName,
        payload,
      },
    });
  }
}
