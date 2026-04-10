import { describe, it, expect } from "vitest";
import addDirectfileFeature from "../../../../../src/features/list/directfile.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import initDirectFile from "../../../../../src/main_thread/init/directfile_content_initializer.ts";
import mediaElementTracksStore from "../../../../../src/main_thread/tracks_store/media_element_tracks_store.ts";

describe("Features list - Directfile", () => {
  it("should add Directfile in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addDirectfileFeature(featureObject);
    expect(featureObject).toEqual({
      directfile: { initDirectFile, mediaElementTracksStore },
    });
    expect(featureObject.directfile?.initDirectFile).toEqual(initDirectFile);
    expect(featureObject.directfile?.mediaElementTracksStore).toEqual(
      mediaElementTracksStore,
    );
  });
});
