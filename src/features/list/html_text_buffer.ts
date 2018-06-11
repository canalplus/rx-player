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

import htmlTextBuffer from "../../core/source_buffers/text/html";
import { IFeatureListItem } from "../types";

// Add ability to show subtitles as a HTML div
const feature : IFeatureListItem = {
  id: "HTML_TEXT_BUFFER",
  content: htmlTextBuffer,
};

export { feature as HTML_TEXT_BUFFER };
export default feature;
