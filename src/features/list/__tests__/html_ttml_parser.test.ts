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

import HTMLTextDisplayer from "../../../main_thread/text_displayer/html";
import ttmlParser from "../../../parsers/texttracks/ttml/html";
import type { IFeaturesObject } from "../../types";
import addHTMLttmlFeature from "../html_ttml_parser";

describe("Features list - HTML ttml Parser", () => {
  it("should add an HTML ttml Parser in the current features", () => {
    const featureObject = {
      htmlTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addHTMLttmlFeature(featureObject);
    expect(featureObject).toEqual({
      htmlTextTracksParsers: { ttml: ttmlParser },
      htmlTextDisplayer: HTMLTextDisplayer,
    });
    expect(featureObject.htmlTextTracksParsers.ttml).toBe(ttmlParser);
  });
});
