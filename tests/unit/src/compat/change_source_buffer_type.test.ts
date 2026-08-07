import { describe, it, expect, vi } from "vitest";
import type { ISourceBuffer } from "../../../../src/compat/browser_compatibility_types.ts";
import tryToChangeSourceBufferType from "../../../../src/compat/change_source_buffer_type.ts";
import log from "../../../../src/log.ts";

describe("Compat - tryToChangeSourceBufferType", () => {
  it("should just return false if the SourceBuffer provided does not have a changeType method", () => {
    const spy = vi.spyOn(log, "warn");
    const fakeSourceBuffer: ISourceBuffer = {} as unknown as ISourceBuffer;
    expect(tryToChangeSourceBufferType(fakeSourceBuffer, "toto")).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("should return true if the SourceBuffer provided does have a changeType method and the API returned normally", () => {
    const spy = vi.spyOn(log, "warn");
    const changeTypeFn = vi.fn();
    const fakeSourceBuffer = {
      changeType: changeTypeFn,
    } as unknown as ISourceBuffer;
    expect(tryToChangeSourceBufferType(fakeSourceBuffer, "toto")).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("should return false and warn if the SourceBuffer provided does have a changeType method and the API threw", () => {
    const spy = vi.spyOn(log, "warn");
    const err = new Error("bar");
    const changeTypeFn = vi.fn(() => {
      throw err;
    });
    const fakeSourceBuffer = {
      changeType: changeTypeFn,
    } as unknown as ISourceBuffer;
    expect(tryToChangeSourceBufferType(fakeSourceBuffer, "toto")).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      "mse",
      "Could not call 'changeType' on the given SourceBuffer:",
      err,
    );
  });
});
