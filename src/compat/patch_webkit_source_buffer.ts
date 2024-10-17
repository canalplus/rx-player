/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import EventEmitter from "../utils/event_emitter";
import globalScope from "../utils/global_scope";
import isNode from "../utils/is_node";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import queueMicrotask from "../utils/queue_microtask";

interface IWebKitSourceBufferConstructor {
  new (): IWebKitSourceBuffer;
  prototype: IWebKitSourceBuffer;
}

interface IWebKitSourceBuffer
  extends EventEmitter<{
    updatestart: Event;
    update: Event;
    updateend: Event;
    error: Event | Error;
  }> {
  _emitUpdate?: (eventName: "error" | "update", val: unknown) => void;
  appendBuffer?: (data: BufferSource) => void;
  updating: boolean;
  append(data: BufferSource): void;
  remove(from: number, to: number): void;
}

// TODO This is the last ugly side-effect here.
// Either remove it or find the best way to implement that
export default function patchWebkitSourceBuffer(): void {
  // old WebKit SourceBuffer implementation,
  // where a synchronous append is used instead of appendBuffer
  if (
    !isNode &&
    !isNullOrUndefined(
      (
        globalScope as typeof globalScope & {
          WebKitSourceBuffer?: IWebKitSourceBufferConstructor;
        }
      ).WebKitSourceBuffer,
    ) &&
    (
      globalScope as typeof globalScope & {
        WebKitSourceBuffer: IWebKitSourceBufferConstructor;
      }
    ).WebKitSourceBuffer.prototype.addEventListener === undefined
  ) {
    const sourceBufferWebkitRef: IWebKitSourceBufferConstructor = (
      globalScope as unknown as {
        WebKitSourceBuffer: IWebKitSourceBufferConstructor;
      }
    ).WebKitSourceBuffer;
    const sourceBufferWebkitProto = sourceBufferWebkitRef.prototype;

    for (const fnName in EventEmitter.prototype) {
      if (EventEmitter.prototype.hasOwnProperty(fnName)) {
        (sourceBufferWebkitProto as unknown as Record<string, unknown>)[fnName] = (
          EventEmitter.prototype as unknown as Record<string, unknown>
        )[fnName];
      }
    }

    (
      sourceBufferWebkitProto as unknown as {
        _listeners: Array<() => void>;
      }
    )._listeners = [];

    sourceBufferWebkitProto._emitUpdate = function (
      eventName: "error" | "update",
      val: unknown,
    ) {
      queueMicrotask(() => {
        this.trigger(eventName, val as Event);
        this.updating = false;
        this.trigger("updateend", new Event("updateend"));
      });
    };

    sourceBufferWebkitProto.appendBuffer = function (data: BufferSource) {
      if (this.updating) {
        throw new Error("updating");
      }
      this.trigger("updatestart", new Event("updatestart"));
      this.updating = true;
      try {
        this.append(data);
      } catch (error) {
        this._emitUpdate?.("error", error);
        return;
      }
      this._emitUpdate?.("update", new Event("update"));
    };
  }
}
