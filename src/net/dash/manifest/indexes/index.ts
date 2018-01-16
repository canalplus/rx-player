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

import { IRepresentationIndex } from "../../../../manifest";
import BaseRepresentationIndex, {
  IBaseIndex,
} from "./base";
import ListRepresentationIndex, {
  IListIndex,
} from "./list";
import TemplateRepresentationIndex, {
  ITemplateIndex,
} from "./template";
import TimelineRepresentationIndex, {
  ITimelineIndex,
} from "./timeline";

export default function createRepresentationIndex(
  index : IBaseIndex|IListIndex|ITemplateIndex|ITimelineIndex
) : IRepresentationIndex {
  switch (index.indexType) {
    case "base":
      return new BaseRepresentationIndex(index);
    case "list":
      return new ListRepresentationIndex(index);
    case "template":
      return new TemplateRepresentationIndex(index);
    case "timeline":
      return new TimelineRepresentationIndex(index);
  }

  throw new Error("DASH MPD Indexes: Type not found.");
}
