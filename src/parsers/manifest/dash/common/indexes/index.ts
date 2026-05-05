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

import type { IBaseIndexContextArgument } from "./base.ts";
import BaseRepresentationIndex from "./base.ts";
import type { IListIndexContextArgument } from "./list.ts";
import ListRepresentationIndex from "./list.ts";
import type { ITemplateIndexContextArgument } from "./template.ts";
import TemplateRepresentationIndex from "./template.ts";
import type { ITimelineIndexContextArgument } from "./timeline/index.ts";
import TimelineRepresentationIndex from "./timeline/index.ts";

export type {
  IBaseIndexContextArgument,
  IListIndexContextArgument,
  ITemplateIndexContextArgument,
  ITimelineIndexContextArgument,
};
export {
  BaseRepresentationIndex,
  ListRepresentationIndex,
  TemplateRepresentationIndex,
  TimelineRepresentationIndex,
};
