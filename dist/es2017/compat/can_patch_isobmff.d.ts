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
/**
 * TODO(pierre): fix patchSegmentInPlace to work with IE11. Maybe
 * try to put free atom inside traf children
 *
 * Returns true if the current target is tolerant enough for us to
 * simply be able to "patch" an ISOBMFF segment or if we have to create a
 * new one from scratch instead.
 * @returns {Boolean}
 */
export default function canPatchISOBMFFSegment(): boolean;
