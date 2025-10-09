import { describe, it, expect } from "vitest";
import initializeWorkerMain from "../../../core/main/worker";
import { MonoThreadCoreInterface } from "../../../main_thread/core_interface/monothread";
import MultiThreadContentInitializer from "../../../main_thread/init/multi_thread_content_initializer";
import dashJsParser from "../../../parsers/manifest/dash/js-parser";
import DASHFeature from "../../../transports/dash";
import type { IFeaturesObject } from "../../types";
import addDASHFeature from "../dash";

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
        init: MultiThreadContentInitializer,
        coreInterface: MonoThreadCoreInterface,
        workerMain: initializeWorkerMain,
      },
    });
    expect(featureObject.transports.dash).toBe(DASHFeature);
    expect(featureObject.monothread).not.toBe(null);
    expect(featureObject.monothread?.init).toBe(MultiThreadContentInitializer);
    expect(featureObject.monothread?.coreInterface).toBe(MonoThreadCoreInterface);
    expect(featureObject.monothread?.workerMain).toBe(initializeWorkerMain);
  });
});
