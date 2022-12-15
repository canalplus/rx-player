/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

// eslint-disable-next-line max-len
import mediaElementTrackChoiceManager from "../../../core/api/tracks_management/media_element_track_choice_manager";
import initDirectFile from "../../../core/init/directfile_content_initializer";
import addDirectfileFeature from "../directfile";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
jest.mock("../../../core/init/directfile_content_initializer", () => ({
  __esModule: true as const,
  default: jest.fn(),
}));

describe("Features list - Directfile", () => {
  it("should add Directfile in the current features", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureObject : any = {};
    addDirectfileFeature(featureObject);
    expect(featureObject).toEqual({
      directfile: { initDirectFile,
                    mediaElementTrackChoiceManager },
    });
    expect(featureObject.directfile.initDirectFile).toEqual(initDirectFile);
    expect(featureObject.directfile.mediaElementTrackChoiceManager)
      .toEqual(mediaElementTrackChoiceManager);
  });
});
