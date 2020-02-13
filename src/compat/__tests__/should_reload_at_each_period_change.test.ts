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

describe("shouldReloadAtEachPeriodChange", () => {
  beforeEach(() => {
    jest.resetModules();
  });

it("should be true if on Safari", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true,
               isSafari: true };
    });
    /* tslint:disable no-unsafe-any */
    const shouldReloadAtEachPeriodChange =
      require("../should_reload_at_each_period_change").default;
    /* tslint:enable no-unsafe-any */
    expect(shouldReloadAtEachPeriodChange).toBe(true);
  });

it("should be false if not on Safari", () => {
    jest.mock("../browser_detection", () => {
      return { __esModule: true,
               isSafari: false };
    });
    /* tslint:disable no-unsafe-any */
    const shouldReloadAtEachPeriodChange =
      require("../should_reload_at_each_period_change").default;
    /* tslint:enable no-unsafe-any */
    expect(shouldReloadAtEachPeriodChange).toBe(false);
  });
});
