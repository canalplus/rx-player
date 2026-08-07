import { describe, it, expect } from "vitest";
import initializeCoreEntry from "../../../../../src/core/entry/index.ts";
import addDASHFeature from "../../../../../src/features/list/dash.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import { MonoThreadCoreInterface } from "../../../../../src/main_thread/core_interface/monothread.ts";
import MediaSourceContentInitializer from "../../../../../src/main_thread/init/media_source_content_initializer.ts";
import dashJsParser from "../../../../../src/parsers/manifest/dash/js-parser/index.ts";
import DASHFeature from "../../../../../src/transports/dash/index.ts";

describe("Features list - DASH", () => {
  it("should add DASH in the current features", () => {
    const featureObject = {
      transports: {},
      dashParsers: { js: null, wasm: null },
      monothread: null,
    } as unknown as IFeaturesObject;
    addDASHFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { dash: DASHFeature },
      dashParsers: { js: dashJsParser, wasm: null },
      monothread: {
        init: MediaSourceContentInitializer,
        coreInterface: MonoThreadCoreInterface,
        initializeCoreEntry,
      },
    });
    expect(featureObject.transports.dash).toBe(DASHFeature);
    expect(featureObject.monothread).not.toBe(null);
    expect(featureObject.monothread?.init).toBe(MediaSourceContentInitializer);
    expect(featureObject.monothread?.coreInterface).toBe(MonoThreadCoreInterface);
    expect(featureObject.monothread?.initializeCoreEntry).toBe(initializeCoreEntry);
  });
});
