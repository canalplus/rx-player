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

/* eslint-disable-next-line max-len */
import MediaSourceContentInitializer from "../../../core/init/media_source_content_initializer";
import type { IFeaturesObject } from "../../../features/types";
import local from "../../../transports/local";
import addLocalManifestFeature from "../local";

describe("Features list - LOCAL_MANIFEST", () => {
  it("should add LOCAL_MANIFEST in the current features", () => {
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addLocalManifestFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { local },
      mediaSourceInit: MediaSourceContentInitializer,
    });
    expect(featureObject.transports.local).toBe(local);
    expect(featureObject.mediaSourceInit).toBe(MediaSourceContentInitializer);
  });
});
