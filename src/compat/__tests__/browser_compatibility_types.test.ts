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

describe("compat - browser compatibility types", () => {
  it("should throw when using compat MediaKeys methods if no MediaKeys API", () => {
    const origMediaKeys = (window as any).MediaKeys;
    const origMozMediaKeys = (window as any).MozMediaKeys;
    const origWebKitMediaKeys = (window as any).WebKitMediaKeys;
    const origMSMediaKeys = (window as any).MSMediaKeys;

    (window as any).MediaKeys = undefined;
    (window as any).MozMediaKeys = undefined;
    (window as any).WebKitMediaKeys = undefined;
    (window as any).MSMediaKeys = undefined;

    const { MediaKeys_ } = require("../browser_compatibility_types");

    const mediaKeys = new MediaKeys_();

    expect(() => mediaKeys.create()).toThrow();
    expect(() => mediaKeys.createSession()).toThrow();
    expect(() => mediaKeys.isTypeSupported()).toThrow();
    expect(() => mediaKeys.setServerCertificate()).toThrow();

    (window as any).MediaKeys = origMediaKeys;
    (window as any).MozMediaKeys = origMozMediaKeys;
    (window as any).WebKitMediaKeys = origWebKitMediaKeys;
    (window as any).MSMediaKeys = origMSMediaKeys;
  });
});
