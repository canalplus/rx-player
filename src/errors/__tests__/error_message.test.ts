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

import { expect } from "chai";
import errorMessage from "../error_message";

describe("Errors - generateErrorMessage", () => {
  it("should format a certain way when only a name and a code is given", () => {
    expect(errorMessage("foo", "bar"))
      .to.equal("foo (bar)");
  });

  it("should format a certain way if the reason given is null", () => {
    expect(errorMessage("foo", "bar", "baz"))
      .to.equal("foo (bar) baz");
  });

  it("should format a certain way if the reason given is a string", () => {
    expect(errorMessage("foo", "bar", "baz"))
      .to.equal("foo (bar) baz");
  });

  it("should format a certain way if the reason given is an Error", () => {
    const err = new Error("idk");
    expect(errorMessage("foo", "bar", err))
      .to.equal("foo (bar) idk");
  });

  it("should format a certain way if the reason given is an Event", () => {
    const evt = new Event("test");
    expect(errorMessage("foo", "bar", evt))
      .to.equal("foo (bar) test");
  });
});
