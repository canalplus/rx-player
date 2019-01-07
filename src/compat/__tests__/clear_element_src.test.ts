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

import clearElementSrc from "../clear_element_src";

describe("Compat - clearElementSrc", () => {
  it("should empty the src and remove the Attribute for a given Element", () => {
    const fakeElement : any = {
      src: "foo",
      removeAttribute() { return null; },
    };
    const spy = jest.spyOn(fakeElement, "removeAttribute");
    clearElementSrc(fakeElement);
    expect(fakeElement.src).toBe("");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("src");
  });
});
