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
import SmoothFeature from "../../../transports/smooth";
import type { IFeaturesObject } from "../../types";
import addSmoothFeature from "../smooth";

describe("Features list - Smooth", () => {
  it("should add Smooth in the current features", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addSmoothFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { smooth: SmoothFeature },
      mediaSourceInit: MediaSourceContentInitializer,
    });
    expect(featureObject.transports.smooth).toBe(SmoothFeature);
    expect(featureObject.mediaSourceInit).toBe(MediaSourceContentInitializer);
  });
});
