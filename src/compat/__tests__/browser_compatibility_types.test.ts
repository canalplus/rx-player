import { describe, beforeEach, it, expect, vi } from "vitest";
import globalScope from "../../utils/global_scope";

describe("compat - browser compatibility types", () => {
  interface IFakeWindow {
    MediaSource?: unknown;
    MozMediaSource?: unknown;
    WebKitMediaSource?: unknown;
    MSMediaSource?: unknown;
    ManagedMediaSource?: unknown;
  }
  const gs = globalScope as IFakeWindow;
  beforeEach(() => {
    vi.resetModules();
  });

  it("should use the native MediaSource if defined", async () => {
    vi.doMock("../../utils/is_node", () => ({
      default: false,
    }));

    const origMediaSource = gs.MediaSource;
    const origMozMediaSource = gs.MozMediaSource;
    const origWebKitMediaSource = gs.WebKitMediaSource;
    const origMSMediaSource = gs.MSMediaSource;
    const origManagedMediaSource = gs.ManagedMediaSource;

    gs.MediaSource = { a: 1 };
    gs.MozMediaSource = { a: 2 };
    gs.WebKitMediaSource = { a: 3 };
    gs.MSMediaSource = { a: 4 };
    gs.ManagedMediaSource = { a: 5 };

    const { MediaSource_ } = await vi.importActual("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 1 });

    gs.MediaSource = origMediaSource;
    gs.MozMediaSource = origMozMediaSource;
    gs.WebKitMediaSource = origWebKitMediaSource;
    gs.MSMediaSource = origMSMediaSource;
    gs.ManagedMediaSource = origManagedMediaSource;
  });

  it("should use MozMediaSource if defined and MediaSource is not", async () => {
    vi.doMock("../../utils/is_node", () => ({
      default: false,
    }));

    const origMediaSource = gs.MediaSource;
    const origMozMediaSource = gs.MozMediaSource;
    const origWebKitMediaSource = gs.WebKitMediaSource;
    const origMSMediaSource = gs.MSMediaSource;
    const origManagedMediaSource = gs.ManagedMediaSource;

    gs.MediaSource = undefined;
    gs.MozMediaSource = { a: 2 };
    gs.WebKitMediaSource = undefined;
    gs.MSMediaSource = undefined;

    const { MediaSource_ } = await vi.importActual("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 2 });

    gs.MediaSource = origMediaSource;
    gs.MozMediaSource = origMozMediaSource;
    gs.WebKitMediaSource = origWebKitMediaSource;
    gs.MSMediaSource = origMSMediaSource;
    gs.ManagedMediaSource = origManagedMediaSource;
  });

  it("should use WebKitMediaSource if defined and MediaSource is not", async () => {
    vi.doMock("../../utils/is_node", () => ({
      default: false,
    }));

    const origMediaSource = gs.MediaSource;
    const origMozMediaSource = gs.MozMediaSource;
    const origWebKitMediaSource = gs.WebKitMediaSource;
    const origMSMediaSource = gs.MSMediaSource;
    const origManagedMediaSource = gs.ManagedMediaSource;

    gs.MediaSource = undefined;
    gs.MozMediaSource = undefined;
    gs.WebKitMediaSource = { a: 3 };
    gs.MSMediaSource = undefined;

    const { MediaSource_ } = await vi.importActual("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 3 });

    gs.MediaSource = origMediaSource;
    gs.MozMediaSource = origMozMediaSource;
    gs.WebKitMediaSource = origWebKitMediaSource;
    gs.MSMediaSource = origMSMediaSource;
    gs.ManagedMediaSource = origManagedMediaSource;
  });

  it("should use MSMediaSource if defined and MediaSource is not", async () => {
    vi.doMock("../../utils/is_node", () => ({
      default: false,
    }));

    const origMediaSource = gs.MediaSource;
    const origMozMediaSource = gs.MozMediaSource;
    const origWebKitMediaSource = gs.WebKitMediaSource;
    const origMSMediaSource = gs.MSMediaSource;
    const origManagedMediaSource = gs.ManagedMediaSource;

    gs.MediaSource = undefined;
    gs.MozMediaSource = undefined;
    gs.WebKitMediaSource = undefined;
    gs.MSMediaSource = { a: 4 };

    const { MediaSource_ } = await vi.importActual("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 4 });

    gs.MediaSource = origMediaSource;
    gs.MozMediaSource = origMozMediaSource;
    gs.WebKitMediaSource = origWebKitMediaSource;
    gs.MSMediaSource = origMSMediaSource;
    gs.ManagedMediaSource = origManagedMediaSource;
  });

  it("should use ManagedMediaSource if defined and MediaSource is not", async () => {
    vi.doMock("../../utils/is_node", () => ({
      default: false,
    }));

    const origMediaSource = gs.MediaSource;
    const origMozMediaSource = gs.MozMediaSource;
    const origWebKitMediaSource = gs.WebKitMediaSource;
    const origMSMediaSource = gs.MSMediaSource;
    const origManagedMediaSource = gs.ManagedMediaSource;

    gs.MediaSource = undefined;
    gs.MozMediaSource = undefined;
    gs.WebKitMediaSource = undefined;
    gs.MSMediaSource = undefined;
    gs.ManagedMediaSource = { a: 5 };

    const { MediaSource_ } = await vi.importActual("../browser_compatibility_types");
    expect(MediaSource_).toEqual({ a: 4 });

    gs.MediaSource = origMediaSource;
    gs.MozMediaSource = origMozMediaSource;
    gs.WebKitMediaSource = origWebKitMediaSource;
    gs.MSMediaSource = origMSMediaSource;
    gs.ManagedMediaSource = origManagedMediaSource;
  });
});
