import { describe, it, expect } from "vitest";
import OtherError from "../other_error";

describe("errors - OtherError", () => {
  it("should format an OtherError", () => {
    const otherError = new OtherError("NONE", "tata");
    expect(otherError).toBeInstanceOf(Error);
    expect(otherError.name).toBe("OtherError");
    expect(otherError.type).toBe("OTHER_ERROR");
    expect(otherError.code).toBe("NONE");
    expect(otherError.fatal).toBe(false);
    expect(otherError.message).toBe("NONE: tata");
  });

  it("should be able to set it as fatal", () => {
    const reason = "test";
    const otherError = new OtherError("NONE", reason);
    otherError.fatal = true;
    expect(otherError).toBeInstanceOf(Error);
    expect(otherError.name).toBe("OtherError");
    expect(otherError.type).toBe("OTHER_ERROR");
    expect(otherError.code).toBe("NONE");
    expect(otherError.fatal).toBe(true);
    expect(otherError.message).toBe("NONE: test");
  });

  it("should filter in a valid error code", () => {
    const reason = "test";
    const otherError = new OtherError("PIPELINE_LOAD_ERROR", reason);
    otherError.fatal = true;
    expect(otherError).toBeInstanceOf(Error);
    expect(otherError.name).toBe("OtherError");
    expect(otherError.type).toBe("OTHER_ERROR");
    expect(otherError.code).toBe("PIPELINE_LOAD_ERROR");
    expect(otherError.fatal).toBe(true);
    expect(otherError.message).toBe("PIPELINE_LOAD_ERROR: test");
  });
});
