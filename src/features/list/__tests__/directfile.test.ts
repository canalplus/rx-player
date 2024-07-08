import { describe, it, expect } from "vitest";
import initDirectFile from "../../../main_thread/init/directfile_content_initializer";
import mediaElementTracksStore from "../../../main_thread/tracks_store/media_element_tracks_store";
import type { IFeaturesObject } from "../../types";
import addDirectfileFeature from "../directfile";

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
