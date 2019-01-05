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

import warnOnce from "../warn_once";

describe("utils - warnOnce", () => {
  it("should only call console.warn once for a given message", () => {
    const spy = jest.fn();
    jest.spyOn(console, "warn").mockImplementation(spy);
    warnOnce("toto titi");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("toto titi");

    warnOnce("toto titi");

    expect(spy).toHaveBeenCalledTimes(1);

    warnOnce("toto titi");
    warnOnce("toto tito");

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(2, "toto tito");
  });
});
