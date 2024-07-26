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
 * Returns true if the given codec is supported by the browser's MediaSource
 * implementation.
 * @param {string} mimeType - The MIME media type that you want to test support
 * for in the current browser.
 * This may include the codecs parameter to provide added details about the
 * codecs used within the file.
 * @returns {Boolean}
 */
export default function isCodecSupported(mimeType: string): boolean;
