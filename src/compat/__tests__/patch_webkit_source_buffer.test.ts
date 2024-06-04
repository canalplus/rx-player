import { describe, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

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

  it("(appendBuffer) should update buffer", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = vi.fn(() => ({}));
    const _mockEmitUpdate = vi.fn(() => ({}));
    const mockAppend = vi.fn(() => ({}));

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

    const mockTrigger = vi.fn(() => ({}));
    const _mockEmitUpdate = vi.fn(() => ({}));

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
