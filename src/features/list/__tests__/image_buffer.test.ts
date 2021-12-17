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

import imageBuffer from "../../../core/segment_buffers/implementations/image";
import addImageBufferFeature from "../image_buffer";

describe("Features list - HTML Text Buffer", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should add an Image Buffer in the current features", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureObject : any = {};
    addImageBufferFeature(featureObject);
    expect(featureObject).toEqual({ imageBuffer });
    expect(featureObject.imageBuffer).toBe(imageBuffer);
  });
});
