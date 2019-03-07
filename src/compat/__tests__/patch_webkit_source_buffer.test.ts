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

import nextTick from "next-tick";
import EventEmitter from "../../utils/event_emitter";
import patchWebkitSourceBuffer from "../patch_webkit_source_buffer";

describe("compat - parseWebkitSourceBuffer", () => {
  it("should do nothing if no WebkitSourceBuffer", () => {
    const origWebKitSourceBuffer = (window as any).WebKitSourceBuffer;
    (window as any).WebKitSourceBuffer = undefined;
    patchWebkitSourceBuffer();
    expect((window as any).WebKitSourceBuffer).toBe(undefined);
    (window as any).WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("should do nothing if has WebkitSourceBuffer with addEventListener", () => {
    const origWebKitSourceBuffer = (window as any).WebKitSourceBuffer;
    const mockWebKitSourceBuffer = {
      prototype: {
        addEventListener: () => null,
      },
    };
    (window as any).WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();
    expect((window as any).WebKitSourceBuffer).toEqual(mockWebKitSourceBuffer);
    (window as any).WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("should assign EventEmitter funcs to WebKitSourceBuffer", () => {
    const origWebKitSourceBuffer = (window as any).WebKitSourceBuffer;
    const mockWebKitSourceBuffer = {
      prototype: {},
    };
    const mockEventEmitter = {
      prototype: {
        addEventListener: () => null,
        test1: () => null,
        test2: () => null,
      },
    };
    const origEventEmitter = EventEmitter;
    (EventEmitter as any) = mockEventEmitter;
    (window as any).WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();
    const protoWebkitSourceBuffer = (window as any).WebKitSourceBuffer.prototype;
    expect(protoWebkitSourceBuffer.test1).not.toBeUndefined();
    expect(protoWebkitSourceBuffer.test2).not.toBeUndefined();
    expect(protoWebkitSourceBuffer.addEventListener).not.toBeUndefined();
    (window as any).WebKitSourceBuffer = origWebKitSourceBuffer;
    (EventEmitter as any) = origEventEmitter;
  });

  it("(appendBuffer) should update buffer", () => {
    const origWebKitSourceBuffer = (window as any).WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = jest.fn(() => ({}));
    const __mockEmitUpdate = jest.fn(() => ({}));
    const mockAppend = jest.fn(() => ({}));

    (window as any).WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    (window as any).WebKitSourceBuffer.prototype.appendBuffer.call(
      {
        updating: false,
        trigger: mockTrigger,
        __emitUpdate: __mockEmitUpdate,
        append: mockAppend,
      }
    );

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("updatestart");
    expect(__mockEmitUpdate).toHaveBeenCalledTimes(1);
    expect(__mockEmitUpdate).toHaveBeenCalledWith("update");
    (window as any).WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("(appendBuffer) should fail to update buffer if no append function", () => {
    const origWebKitSourceBuffer = (window as any).WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = jest.fn(() => ({}));
    const __mockEmitUpdate = jest.fn(() => ({}));

    (window as any).WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    (window as any).WebKitSourceBuffer.prototype.appendBuffer.call(
      {
        updating: false,
        trigger: mockTrigger,
        __emitUpdate: __mockEmitUpdate,
      }
    );

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("updatestart");
    expect(__mockEmitUpdate).toHaveBeenCalledTimes(1);

    const err = new TypeError("this.append is not a function");
    expect(__mockEmitUpdate).toHaveBeenCalledWith("error", err);
    (window as any).WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("(appendBuffer) should fail to update buffer if updating", () => {
    const origWebKitSourceBuffer = (window as any).WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };
    (window as any).WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    expect(() => (window as any).WebKitSourceBuffer.prototype.appendBuffer.call(
      { updating: true }
    )).toThrowError("updating");
    (window as any).WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  // FIXME
  xit("(__emitUpdate) should behave normally (trigger two events)", () => {
    const origNextTick = nextTick;
    (nextTick as any) = (func: any) => func();
    const origWebKitSourceBuffer = (window as any).WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = jest.fn(() => ({}));

    (window as any).WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    (window as any).WebKitSourceBuffer.prototype.__emitUpdate.call(
      {
        updating: false,
        trigger: mockTrigger,
      }
    );
    expect(mockTrigger).toHaveBeenCalledTimes(2);
    (window as any).WebKitSourceBuffer = origWebKitSourceBuffer;
    (nextTick as any) = origNextTick;
  });
});
