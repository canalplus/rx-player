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

import log from "../../log";
import tryToChangeSourceBufferType from "../change_source_buffer_type";

describe("Compat - tryToChangeSourceBufferType", () => {
  /* eslint-disable max-len */
  it("should just return false if the SourceBuffer provided does not have a changeType method", () => {
  /* eslint-enable max-len */

    const spy = jest.spyOn(log, "warn");
    const fakeSourceBuffer : SourceBuffer = {} as unknown as SourceBuffer;
    expect(tryToChangeSourceBufferType(fakeSourceBuffer, "toto"))
      .toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  /* eslint-disable max-len */
  it("should return true if the SourceBuffer provided does have a changeType method and the API returned normally", () => {
  /* eslint-enable max-len */

    const spy = jest.spyOn(log, "warn");
    const changeTypeFn = jest.fn();
    const fakeSourceBuffer = { changeType: changeTypeFn } as unknown as SourceBuffer;
    expect(tryToChangeSourceBufferType(fakeSourceBuffer, "toto"))
      .toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  /* eslint-disable max-len */
  it("should return false and warn if the SourceBuffer provided does have a changeType method and the API threw", () => {
  /* eslint-enable max-len */

    const spy = jest.spyOn(log, "warn");
    const err = new Error("bar");
    const changeTypeFn = jest.fn(() => { throw err; });
    const fakeSourceBuffer = { changeType: changeTypeFn } as unknown as SourceBuffer;
    expect(tryToChangeSourceBufferType(fakeSourceBuffer, "toto"))
      .toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      "Could not call 'changeType' on the given SourceBuffer:",
      err
    );
  });
});
