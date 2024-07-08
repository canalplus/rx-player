import { describe, it, expect } from "vitest";
import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer";
import mainCodecSupportProber from "../../../mse/main_codec_support_prober";
import nativeDashParser from "../../../parsers/manifest/dash/native-parser";
import DASHFeature from "../../../transports/dash";
import type { IFeaturesObject } from "../../types";
import addDASHFeature from "../dash";

describe("Features list - DASH", () => {
  it("should add DASH in the current features", () => {
    const featureObject = {
      transports: {},
      dashParsers: { fastJs: null, native: null, wasm: null },
      mainThreadMediaSourceInit: null,
    } as unknown as IFeaturesObject;
    addDASHFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { dash: DASHFeature },
      dashParsers: { native: nativeDashParser, fastJs: null, wasm: null },
      mainThreadMediaSourceInit: MediaSourceContentInitializer,
      codecSupportProber: mainCodecSupportProber,
    });
    expect(featureObject.transports.dash).toBe(DASHFeature);
    expect(featureObject.mainThreadMediaSourceInit).toBe(MediaSourceContentInitializer);
    expect(featureObject.codecSupportProber).toBe(mainCodecSupportProber);
  });
});
