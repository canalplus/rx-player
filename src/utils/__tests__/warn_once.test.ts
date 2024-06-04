import { describe, it, expect, vi } from "vitest";
import warnOnce from "../warn_once";

describe("utils - warnOnce", () => {
  it("should only call console.warn once for a given message", () => {
    const spy = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(spy);
    warnOnce("toto titi");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("toto titi");

    warnOnce("toto titi");

    expect(spy).toHaveBeenCalledTimes(1);

    warnOnce("toto titi");
    warnOnce("toto tito");

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(2, "toto tito");
  });
});
