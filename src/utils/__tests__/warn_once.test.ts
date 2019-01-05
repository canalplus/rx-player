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

import * as sinon from "sinon";
import warnOnce from "../warn_once";

describe("utils - warnOnce", () => {
  it("should only call console.warn once for a given message", () => {
    const warnSpy = sinon.stub(console, "warn");
    warnOnce("toto titi");

    expect(warnSpy.calledWith("toto titi")).toBe(true);
    expect(warnSpy.calledOnce).toBe(true);

    warnOnce("toto titi");

    expect(warnSpy.calledOnce).toBe(true);

    warnOnce("toto titi");
    warnOnce("toto tito");

    expect(warnSpy.calledWith("toto tito")).toBe(true);
    expect(warnSpy.calledTwice).toBe(true);
    warnSpy.restore();
  });
});
