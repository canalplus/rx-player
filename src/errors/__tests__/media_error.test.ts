import { describe, it, expect } from "vitest";
import type { ISerializedMediaError } from "../media_error";
import MediaError, { deserializeMediaError } from "../media_error";

describe("errors - MediaError", () => {
  it("should format a MediaError", () => {
    const reason = "test";
    const mediaError = new MediaError("MEDIA_TIME_BEFORE_MANIFEST", reason, {
      timeInfo: { position: 5, minPosition: 10, maxPosition: 100 },
    });
    expect(mediaError).toBeInstanceOf(Error);
    expect(mediaError.name).toBe("MediaError");
    expect(mediaError.type).toBe("MEDIA_ERROR");
    expect(mediaError.code).toBe("MEDIA_TIME_BEFORE_MANIFEST");
    expect(mediaError.fatal).toBe(false);
    expect(mediaError.message).toBe("MEDIA_TIME_BEFORE_MANIFEST: test");
  });

  it("should be able to set it as fatal", () => {
    const reason = "test";
    const mediaError = new MediaError("MEDIA_TIME_AFTER_MANIFEST", reason, {
      timeInfo: { position: 5, minPosition: 10, maxPosition: 100 },
    });
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

  it("should expose and serialize custom position metadata", () => {
    const mediaError = new MediaError("MEDIA_TIME_BEFORE_MANIFEST", "test", {
      timeInfo: {
        position: 3,
        minPosition: 10,
        maxPosition: 20,
      },
    });

    expect(mediaError.timeInfo).toEqual({
      position: 3,
      minPosition: 10,
      maxPosition: 20,
    });
    expect(mediaError.serialize()).toEqual({
      isSerializedError: true,
      name: "MediaError",
      code: "MEDIA_TIME_BEFORE_MANIFEST",
      reason: "test",
      tracks: undefined,
      timeInfo: {
        position: 3,
        minPosition: 10,
        maxPosition: 20,
      },
    });
  });

  it("should deserialize a serialized MediaError with timeInfo", () => {
    const serializedError: ISerializedMediaError = {
      isSerializedError: true,
      name: "MediaError",
      code: "MEDIA_TIME_BEFORE_MANIFEST",
      reason: "test",
      tracks: undefined,
      timeInfo: {
        position: 3,
        minPosition: 10,
        maxPosition: 20,
      },
    };

    const mediaError = deserializeMediaError(serializedError);

    expect(mediaError).toBeInstanceOf(MediaError);
    expect(mediaError.code).toBe("MEDIA_TIME_BEFORE_MANIFEST");
    expect(mediaError.message).toBe("MEDIA_TIME_BEFORE_MANIFEST: test");
    expect(mediaError.timeInfo).toEqual(serializedError.timeInfo);
  });

  it("should deserialize a serialized MediaError with tracks", () => {
    const serializedError: ISerializedMediaError = {
      isSerializedError: true,
      name: "MediaError",
      code: "BUFFER_APPEND_ERROR",
      reason: "test",
      tracks: [
        {
          type: "audio",
          track: {
            id: "fra1",
            audioDescription: false,
            language: "fra",
            normalized: "fra",
            representations: [],
          },
        },
      ],
      timeInfo: undefined,
    };

    const mediaError = deserializeMediaError(serializedError);

    expect(mediaError).toBeInstanceOf(MediaError);
    expect(mediaError.code).toBe("BUFFER_APPEND_ERROR");
    expect(mediaError.message).toBe("BUFFER_APPEND_ERROR: test");
    expect(mediaError.tracksInfo).toEqual(serializedError.tracks);
  });

  it("should deserialize a serialized MediaError without metadata", () => {
    const serializedError = {
      isSerializedError: true as const,
      name: "MediaError" as const,
      code: "MEDIA_ERR_NETWORK" as const,
      reason: "test",
      tracks: undefined,
      timeInfo: undefined,
    };

    const mediaError = deserializeMediaError(serializedError);

    expect(mediaError).toBeInstanceOf(MediaError);
    expect(mediaError.code).toBe("MEDIA_ERR_NETWORK");
    expect(mediaError.message).toBe("MEDIA_ERR_NETWORK: test");
    expect(mediaError.timeInfo).toBeUndefined();
    expect(mediaError.tracksInfo).toBeUndefined();
  });
});
