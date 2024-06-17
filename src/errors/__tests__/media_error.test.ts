import { describe, it, expect } from "vitest";
import MediaError from "../media_error";

describe("errors - MediaError", () => {
  it("should format a MediaError", () => {
    const reason = "test";
    const mediaError = new MediaError("MEDIA_TIME_BEFORE_MANIFEST", reason);
    expect(mediaError).toBeInstanceOf(Error);
    expect(mediaError.name).toBe("MediaError");
    expect(mediaError.type).toBe("MEDIA_ERROR");
    expect(mediaError.code).toBe("MEDIA_TIME_BEFORE_MANIFEST");
    expect(mediaError.fatal).toBe(false);
    expect(mediaError.message).toBe("MEDIA_TIME_BEFORE_MANIFEST: test");
  });

  it("should be able to set it as fatal", () => {
    const reason = "test";
    const mediaError = new MediaError("MEDIA_TIME_AFTER_MANIFEST", reason);
    mediaError.fatal = true;
    expect(mediaError).toBeInstanceOf(Error);
    expect(mediaError.name).toBe("MediaError");
    expect(mediaError.type).toBe("MEDIA_ERROR");
    expect(mediaError.code).toBe("MEDIA_TIME_AFTER_MANIFEST");
    expect(mediaError.fatal).toBe(true);
    expect(mediaError.message).toBe("MEDIA_TIME_AFTER_MANIFEST: test");
  });

  it("should filter in a valid error code", () => {
    const reason = "test";
    const mediaError = new MediaError("MEDIA_ERR_NETWORK", reason);
    mediaError.fatal = true;
    expect(mediaError).toBeInstanceOf(Error);
    expect(mediaError.name).toBe("MediaError");
    expect(mediaError.type).toBe("MEDIA_ERROR");
    expect(mediaError.code).toBe("MEDIA_ERR_NETWORK");
    expect(mediaError.fatal).toBe(true);
    expect(mediaError.message).toBe("MEDIA_ERR_NETWORK: test");
  });
});
