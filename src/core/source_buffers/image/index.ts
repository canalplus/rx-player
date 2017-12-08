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

import { IBifThumbnail } from "../../../parsers/images/bif";
import AbstractSourceBuffer from "../abstract_source_buffer";

// TODO
class ImageSourceBuffer
  extends AbstractSourceBuffer<IBifThumbnail[]>
{
  _append() {
    // TODO: handle live case.
    // We suppose here that the first received bsi includes all images
    this.buffered.insert(0, Number.MAX_VALUE);
  }

  /* tslint:disable no-empty */
  _remove() {}
  /* tslint:enable no-empty */

  /* tslint:disable no-empty */
  _abort() {}
  /* tslint:enable no-empty */
}

export default ImageSourceBuffer;
