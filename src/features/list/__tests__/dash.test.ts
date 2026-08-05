import { describe, it, expect } from "vitest";
import initializeCoreEntry from "../../../core/entry/index.ts";
import { MonoThreadCoreInterface } from "../../../main_thread/core_interface/monothread.ts";
import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer.ts";
import dashJsParser from "../../../parsers/manifest/dash/js-parser/index.ts";
import DASHFeature from "../../../transports/dash/index.ts";
import type { IFeaturesObject } from "../../types.ts";
import addDASHFeature from "../dash.ts";

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
