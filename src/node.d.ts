/* eslint-disable @typescript-eslint/no-explicit-any */

// import type { IMediaElement } from "./compat/browser_compatibility_types";

type Transferable = ArrayBuffer;
type MediaEncodingType = "record" | "webrtc";
type MediaKeyMessageType = "individualization-request" | "license-release" | "license-renewal" | "license-request";
type MediaKeySessionClosedReason = "closed-by-application" | "hardware-context-reset" | "internal-error" | "release-acknowledged" | "resource-evicted";
type MediaKeySessionType = "persistent-license" | "temporary";

type MediaKeyStatus = "expired" | "internal-error" | "output-downscaled" | "output-restricted" | "released" | "status-pending" | "usable" | "usable-in-future";
type MediaKeysRequirement = "not-allowed" | "optional" | "required";

type EventListener = (evt: Event) => void;

interface EventListenerObject {
  handleEvent(object: Event): void;
}

type EventListenerOrEventListenerObject = EventListener | EventListenerObject;

interface EventListenerOptions {
  capture?: boolean;
}

interface AddEventListenerOptions extends EventListenerOptions {
  once?: boolean;
  passive?: boolean;
  signal?: AbortSignal;
}

interface XMLHttpRequestEventMap extends XMLHttpRequestEventTargetEventMap {
  readystatechange: Event;
}

type XMLHttpRequestResponseType =
  | ""
  | "arraybuffer"
  | "blob"
  | "document"
  | "json"
  | "text";

interface ArrayBufferTypes {
  ArrayBuffer: ArrayBuffer;
}
interface ArrayBufferConstructor {
  readonly prototype: ArrayBuffer;
  new (byteLength: number): ArrayBuffer;
  isView(arg: any): arg is ArrayBufferView;
}

interface ArrayBufferView {
  /**
   * The ArrayBuffer instance referenced by the array.
   */
  buffer: ArrayBufferLike;

  /**
   * The length in bytes of the array.
   */
  byteLength: number;

  /**
   * The offset in bytes of the array.
   */
  byteOffset: number;
}

type BufferSource = ArrayBufferView | ArrayBuffer;
type XMLHttpRequestBodyInit = Blob | BufferSource | FormData | URLSearchParams | string;

interface XMLHttpRequest extends XMLHttpRequestEventTarget {
  onreadystatechange: ((this: XMLHttpRequest, ev: Event) => any) | null;
  readonly readyState: number;
  readonly response: any;
  readonly responseText: string;
  responseType: XMLHttpRequestResponseType;
  readonly responseURL: string;
  readonly responseXML: Document;
  readonly status: number;
  readonly statusText: string;
  timeout: number;
  withCredentials: boolean;
  abort(): void;
  getAllResponseHeaders(): string;
  getResponseHeader(name: string): string | null;
  open(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void;
  overrideMimeType(mime: string): void;
  send(body?: Document): void;
  /**
   * Combines a header in author request headers.
   *
   * Throws an "InvalidStateError" DOMException if either state is not opened or the send() flag is set.
   *
   * Throws a "SyntaxError" DOMException if name is not a header name or if value is not a header value.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/setRequestHeader)
   */
  setRequestHeader(name: string, value: string): void;
  readonly UNSENT: 0;
  readonly OPENED: 1;
  readonly HEADERS_RECEIVED: 2;
  readonly LOADING: 3;
  readonly DONE: 4;
  addEventListener<K extends keyof XMLHttpRequestEventMap>(
    type: K,
    listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof XMLHttpRequestEventMap>(
    type: K,
    listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => any,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface TimeRanges {
  start(i: number): number;
  end(i: number): number;
  length: number;
}

declare const self: typeof globalThis;
declare const window: typeof globalThis;

// interface HTMLMediaElement extends Element {
// }
// interface HTMLVideoElement extends Element {
// }
// interface HTMLAudioElement extends Element {
// }

interface Attribute {
  value: string;
  toLowerCase(): string;
  toUpperCase(): string;
}

interface GlobalDocument {
  createAttribute(attrName: string): Attribute;
  createElement(elementName: string): Element;
  createTextNode(text: string): Node;
}

// interface TextTrack extends Element {
// }

// interface TextTrackCue extends Element {
// }

declare const document: GlobalDocument;

// declare const HTMLMediaElement: {
//   prototype: HTMLMediaElement;
//   new (): HTMLMediaElement;
// }

// declare const HTMLVideoElement: {
//   prototype: HTMLVideoElement;
// }
// declare const HTMLAudioElement: HTMLAudioElement;

// interface Node {
//   textContent: string;
//   childNodes: Node[];
//   nodeName: string;
//   nextElementSibling: Node;
// }

type HTMLCollection = any;
type MediaKeySystemConfiguration = any;
type Element = any;
type Document = any;
type Node = any;
type TextTrack = any;
type TextTrackCue = any;
type TextTrackList = any;
type Worker = any;
type MessageEvent = any;
type HTMLMediaElement = any;
type HTMLVideoElement = any;
type HTMLAudioElement = any;

// interface Element extends Node {
//   attributes: Attribute[];
//   tagName: string;
//   innerHTML: string;
//   outerHTML: string;
//   style: Record<string, string>;
//   appendChild(node: Node): void;
//   removeChild(node: Node): void;
//   getAttribute(attributeName: string): string | null;
//   setAttribute(attributeName: string, value: string): void;
//   hasAttribute(attributeName: string): boolean;
//   firstElementChild: Element | null;
//   className: string;
// }

// interface Document {
//   documentElement: Element;
// }

interface DOMParser {
  parseFromString(data: string, format: string): Document;
}

declare const DOMParser: {
  prototype: DOMParser;
  new (): DOMParser;
};

// declare const Document: {
//   prototype: Document;
//   new (): Document;
// };

declare const XMLHttpRequest: {
  prototype: XMLHttpRequest;
  new (): XMLHttpRequest;
  readonly UNSENT: 0;
  readonly OPENED: 1;
  readonly HEADERS_RECEIVED: 2;
  readonly LOADING: 3;
  readonly DONE: 4;
};

interface ProgressEvent<T extends EventTarget = EventTarget> extends Event {
  readonly lengthComputable: boolean;
  readonly loaded: number;
  readonly target: T | null;
  readonly total: number;
}

interface XMLHttpRequestEventTargetEventMap {
  abort: ProgressEvent<XMLHttpRequestEventTarget>;
  error: ProgressEvent<XMLHttpRequestEventTarget>;
  load: ProgressEvent<XMLHttpRequestEventTarget>;
  loadend: ProgressEvent<XMLHttpRequestEventTarget>;
  loadstart: ProgressEvent<XMLHttpRequestEventTarget>;
  progress: ProgressEvent<XMLHttpRequestEventTarget>;
  timeout: ProgressEvent<XMLHttpRequestEventTarget>;
}

interface XMLHttpRequestEventTarget extends EventTarget {
  onabort: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null;
  onerror: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null;
  onload: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null;
  onloadend: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null;
  onloadstart: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null;
  onprogress: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null;
  ontimeout: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null;
  addEventListener<K extends keyof XMLHttpRequestEventTargetEventMap>(
    type: K,
    listener: (
      this: XMLHttpRequestEventTarget,
      ev: XMLHttpRequestEventTargetEventMap[K],
    ) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof XMLHttpRequestEventTargetEventMap>(
    type: K,
    listener: (
      this: XMLHttpRequestEventTarget,
      ev: XMLHttpRequestEventTargetEventMap[K],
    ) => any,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

declare const XMLHttpRequestEventTarget: {
  prototype: XMLHttpRequestEventTarget;
  new (): XMLHttpRequestEventTarget;
};
