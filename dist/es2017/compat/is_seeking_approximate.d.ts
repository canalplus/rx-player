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
 * On some devices (right now only seen on Tizen), seeking through the
 * `currentTime` property can lead to the browser re-seeking once the
 * segments have been loaded to improve seeking performances (for
 * example, by seeking right to an intra video frame).
 *
 * This can lead to conflicts with the RxPlayer code.
 *
 * This boolean is only `true` on the devices where this behavior has been
 * observed.
 */
declare const isSeekingApproximate: boolean;
export default isSeekingApproximate;
