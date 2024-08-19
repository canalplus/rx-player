import { describe, it, expect, vi } from "vitest";

import globalScope from "../../utils/global_scope";
import patchWebkitSourceBuffer from "../patch_webkit_source_buffer";

const gs = globalScope as typeof globalScope & {
  WebKitSourceBuffer?:
    | {
        new (): unknown;
        prototype: {
          appendBuffer(data: BufferSource): void;
        };
      }
    | undefined;
};

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
    class MockWebkitSourceBuffer {
      addEventListener() {
        /* noop */
      }
    }
    gs.WebKitSourceBuffer = MockWebkitSourceBuffer as typeof gs.WebKitSourceBuffer;
    patchWebkitSourceBuffer();
    expect(gs.WebKitSourceBuffer).toEqual(MockWebkitSourceBuffer);
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("(appendBuffer) should update buffer", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = vi.fn(() => ({}));
    const _mockEmitUpdate = vi.fn(() => ({}));
    const mockAppend = vi.fn(() => ({}));

    gs.WebKitSourceBuffer = mockWebKitSourceBuffer as typeof gs.WebKitSourceBuffer;
    patchWebkitSourceBuffer();

    gs.WebKitSourceBuffer?.prototype.appendBuffer.call(
      {
        updating: false,
        trigger: mockTrigger,
        _emitUpdate: _mockEmitUpdate,
        append: mockAppend,
      },
      new Uint8Array([]),
    );

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("updatestart", new Event("updatestart"));
    expect(_mockEmitUpdate).toHaveBeenCalledTimes(1);
    expect(_mockEmitUpdate).toHaveBeenCalledWith("update", new Event("update"));
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("(appendBuffer) should fail to update buffer if no append function", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };

    const mockTrigger = vi.fn(() => ({}));
    const _mockEmitUpdate = vi.fn(() => ({}));

    gs.WebKitSourceBuffer = mockWebKitSourceBuffer as typeof gs.WebKitSourceBuffer;
    patchWebkitSourceBuffer();

    gs.WebKitSourceBuffer?.prototype.appendBuffer.call(
      {
        updating: false,
        trigger: mockTrigger,
        _emitUpdate: _mockEmitUpdate,
      },
      new Uint8Array([]),
    );

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith("updatestart", new Event("updatestart"));
    expect(_mockEmitUpdate).toHaveBeenCalledTimes(1);

    const err = new TypeError("this.append is not a function");
    expect(_mockEmitUpdate).toHaveBeenCalledWith("error", err);
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
  });

  it("(appendBuffer) should fail to update buffer if updating", () => {
    const origWebKitSourceBuffer = gs.WebKitSourceBuffer;
    const mockWebKitSourceBuffer = { prototype: {} };
    gs.WebKitSourceBuffer = mockWebKitSourceBuffer as typeof gs.WebKitSourceBuffer;
    patchWebkitSourceBuffer();

    expect(() =>
      gs.WebKitSourceBuffer?.prototype.appendBuffer.call(
        { updating: true },
        new Uint8Array([]),
      ),
    ).toThrowError("updating");
    gs.WebKitSourceBuffer = origWebKitSourceBuffer;
  });
});
