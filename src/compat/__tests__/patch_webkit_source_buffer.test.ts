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
import globalScope from "../../utils/global_scope";
import patchWebkitSourceBuffer from "../patch_webkit_source_buffer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gs = globalScope as any;

describe("compat - parseWebkitSourceBuffer", () => {
  it("should do nothing if no WebkitSourceBuffer", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
    gs.WebKitSourceBuffer = undefined;
    patchWebkitSourceBuffer();
    expect(gs.WebKitSourceBuffer).toBe(undefined);
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("should do nothing if has WebkitSourceBuffer with addEventListener", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = {
      prototype: {
        addEventListener: () => null,
      },
    };
    gs.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();
    expect(gs.WebKitSourceBuffer).toEqual(mockWebKitSourceBuffer);
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("should assign EventEmitter funcs to WebKitSourceBuffer", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
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
    gs.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();
    const protoWebkitSourceBuffer = gs.WebKitSourceBuffer.prototype;
    expect(protoWebkitSourceBuffer.test1).not.toBeUndefined();
    expect(protoWebkitSourceBuffer.test2).not.toBeUndefined();
    expect(protoWebkitSourceBuffer.addEventListener).not.toBeUndefined();
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (EventEmitter as any) = origEventEmitter;
  });

  it("(appendBuffer) should update buffer", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = jest.fn(() => ({}));
    const _mockEmitUpdate = jest.fn(() => ({}));
    const mockAppend = jest.fn(() => ({}));

    gs.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    gs.WebKitSourceBuffer.prototype.appendBuffer.call({
      updating: false,
      trigger: mockTrigger,
      _emitUpdate: _mockEmitUpdate,
      append: mockAppend,
    });

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("updatestart");
    expect(_mockEmitUpdate).toHaveBeenCalledTimes(1);
    expect(_mockEmitUpdate).toHaveBeenCalledWith("update");
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("(appendBuffer) should fail to update buffer if no append function", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = jest.fn(() => ({}));
    const _mockEmitUpdate = jest.fn(() => ({}));

    gs.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    gs.WebKitSourceBuffer.prototype.appendBuffer.call({
      updating: false,
      trigger: mockTrigger,
      _emitUpdate: _mockEmitUpdate,
    });

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("updatestart");
    expect(_mockEmitUpdate).toHaveBeenCalledTimes(1);

    const err = new TypeError("this.append is not a function");
    expect(_mockEmitUpdate).toHaveBeenCalledWith("error", err);
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("(appendBuffer) should fail to update buffer if updating", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };
    gs.WebKitSourceBuffer = mockWebKitSourceBuffer;
    patchWebkitSourceBuffer();

    expect(() =>
      gs.WebKitSourceBuffer.prototype.appendBuffer.call({ updating: true }),
    ).toThrowError("updating");
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
  });
});
