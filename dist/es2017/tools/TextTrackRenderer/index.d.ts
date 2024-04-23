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
import TextTrackRenderer, { ISetTextTrackArguments } from "./text_track_renderer";
export { HTML_SAMI_PARSER as SAMI_PARSER } from "../../features/list/html_sami_parser";
export { HTML_SRT_PARSER as SRT_PARSER } from "../../features/list/html_srt_parser";
export { HTML_TTML_PARSER as TTML_PARSER } from "../../features/list/html_ttml_parser";
export { HTML_VTT_PARSER as VTT_PARSER } from "../../features/list/html_vtt_parser";
export default TextTrackRenderer;
export { ISetTextTrackArguments };
