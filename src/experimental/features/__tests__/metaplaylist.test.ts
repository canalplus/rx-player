import { describe, it, expect } from "vitest";
import type { IFeaturesObject } from "../../../features/types";
import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer";
import mainCodecSupportProber from "../../../mse/main_codec_support_prober";
import metaplaylist from "../../../transports/metaplaylist";
import addLocalManifestFeature from "../metaplaylist";

describe("Features list - METAPLAYLIST", () => {
  it("should add METAPLAYLIST in the current features", () => {
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addLocalManifestFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { metaplaylist },
      mainThreadMediaSourceInit: MediaSourceContentInitializer,
      codecSupportProber: mainCodecSupportProber,
    });
    expect(featureObject.transports.metaplaylist).toBe(metaplaylist);
    expect(featureObject.mainThreadMediaSourceInit).toBe(MediaSourceContentInitializer);
    expect(featureObject.codecSupportProber).toBe(mainCodecSupportProber);
  });
});
