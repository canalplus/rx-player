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
import EventEmitter from "../../utils/event_emitter";
/**
 * Class allowing to start playing a content on an `HTMLMediaElement`.
 *
 * The actual constructor arguments depend on the `ContentInitializer` defined,
 * but should reflect all potential configuration wanted relative to this
 * content's playback.
 *
 * Various events may be emitted by a `ContentInitializer`. However, no event
 * should be emitted before `prepare` or `start` is called and no event should
 * be emitted after `dispose` is called.
 */
export class ContentInitializer extends EventEmitter {
}
