import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import isCodecSupported from "../is_codec_supported.ts";

type IMockedMediaSource =
  | {
      isTypeSupported?: ((codec: string) => boolean) | undefined;
    }
  | undefined;

const mocks: { default: { MediaSource_: IMockedMediaSource } } = vi.hoisted(() => {
  return {
    default: {
      MediaSource_: {},
    },
  };
});

vi.mock("../browser_compatibility_types", () => {
  return mocks;
});

describe("Compat - isCodecSupported", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    mocks.default.MediaSource_ = {};
  });

  it("should return false if MediaSource is not supported in the current device", () => {
    mocks.default.MediaSource_ = undefined;
    expect(isCodecSupported(document.createElement("video"), "foo")).toEqual(false);
    expect(isCodecSupported(document.createElement("video"), "")).toEqual(false);
  });

  it("should return true in any case if the MediaSource does not have the right function", () => {
    mocks.default.MediaSource_ = { isTypeSupported: undefined };
    expect(isCodecSupported(document.createElement("video"), "foo")).toEqual(true);
    expect(isCodecSupported(document.createElement("video"), "")).toEqual(true);
  });

  it("should return true if MediaSource.isTypeSupported returns true", () => {
    mocks.default.MediaSource_ = {
      isTypeSupported(_codec: string) {
        return true;
      },
    };
    expect(isCodecSupported(document.createElement("video"), "foo")).toEqual(true);
    expect(isCodecSupported(document.createElement("video"), "")).toEqual(true);
  });

  it("should return false if MediaSource.isTypeSupported returns false", () => {
    mocks.default.MediaSource_ = {
      isTypeSupported(_codec: string) {
        return false;
      },
    };
    expect(
      isCodecSupported(document.createElement("video"), "oohjustlikeweneversaidgoodbye"),
    ).toEqual(false);
    expect(
      isCodecSupported(document.createElement("video"), "ontheinternetwaitingtosayhi"),
    ).toEqual(false);
  });
});
