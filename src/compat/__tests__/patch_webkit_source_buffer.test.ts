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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import EventEmitter from "../../utils/event_emitter";
import patchWebkitSourceBuffer from "../patch_webkit_source_buffer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = window as any;

describe("compat - parseWebkitSourceBuffer", () => {
  it("should do nothing if no WebkitSourceBuffer", () => {
    const origWebKitSourceBuffer = win.WebKitSourceBuffer;
    win.WebKitSourceBuffer = undefined;
    patchWebkitSourceBuffer();
    expect(win.WebKitSourceBuffer).toBe(undefined);
    win.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("should do nothing if has WebkitSourceBuffer with addEventListener", () => {
    const origWebKitSourceBuffer = win.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = {
      prototype: {
        addEventListener: () => null,
      },
    };
    win.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();
    expect(win.WebKitSourceBuffer).toEqual(mockWebKitSourceBuffer);
    win.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("should assign EventEmitter funcs to WebKitSourceBuffer", () => {
    const origWebKitSourceBuffer = win.WebKitSourceBuffer;
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (EventEmitter as any) = mockEventEmitter;
    win.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();
    const protoWebkitSourceBuffer = win.WebKitSourceBuffer.prototype;
    expect(protoWebkitSourceBuffer.test1).not.toBeUndefined();
    expect(protoWebkitSourceBuffer.test2).not.toBeUndefined();
    expect(protoWebkitSourceBuffer.addEventListener).not.toBeUndefined();
    win.WebKitSourceBuffer = origWebKitSourceBuffer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (EventEmitter as any) = origEventEmitter;
  });

  it("(appendBuffer) should update buffer", () => {
    const origWebKitSourceBuffer = win.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = jest.fn(() => ({}));
    const _mockEmitUpdate = jest.fn(() => ({}));
    const mockAppend = jest.fn(() => ({}));

    win.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    win.WebKitSourceBuffer.prototype.appendBuffer.call(
      {
        updating: false,
        trigger: mockTrigger,
        _emitUpdate: _mockEmitUpdate,
        append: mockAppend,
      }
    );

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("updatestart");
    expect(_mockEmitUpdate).toHaveBeenCalledTimes(1);
    expect(_mockEmitUpdate).toHaveBeenCalledWith("update");
    win.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("(appendBuffer) should fail to update buffer if no append function", () => {
    const origWebKitSourceBuffer = win.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = jest.fn(() => ({}));
    const _mockEmitUpdate = jest.fn(() => ({}));

    win.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    win.WebKitSourceBuffer.prototype.appendBuffer.call(
      {
        updating: false,
        trigger: mockTrigger,
        _emitUpdate: _mockEmitUpdate,
      }
    );

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("updatestart");
    expect(_mockEmitUpdate).toHaveBeenCalledTimes(1);

    const err = new TypeError("this.append is not a function");
    expect(_mockEmitUpdate).toHaveBeenCalledWith("error", err);
    win.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("(appendBuffer) should fail to update buffer if updating", () => {
    const origWebKitSourceBuffer = win.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };
    win.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    expect(() => win.WebKitSourceBuffer.prototype.appendBuffer.call(
      { updating: true }
    )).toThrowError("updating");
    win.WebKitSourceBuffer = origWebKitSourceBuffer;
  });
});
