/**
 * Copyright 2019 CANAL+ Group
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

import { AsyncSubject, Subscription } from "rxjs";
import Manifest from "../../../../../manifest";
import { IRepresentationFilters } from "../../types";

export enum ContentType {
  VIDEO = "video",
  AUDIO = "audio",
  TEXT = "text",
}

export interface IActiveDownload {
  [contentID: string]: Subscription;
}

export interface IActivePauses {
  [contentID: string]: AsyncSubject<void>;
}

export interface IContextManager {
  manifest: Manifest;
  filters?: IRepresentationFilters;
}
