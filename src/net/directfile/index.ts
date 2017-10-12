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

import { Observable } from "rxjs/Observable";

// TODO What? just don't call the pipeline for directfile
// TODO Delete this file and handle it elsewhere

const manifestPipeline = {
  loader({ url } : any) : any {
    return Observable.of({ url });
  },
  parser({ url } : any) : any {
    const manifest = {
      transportType: "directfile",
      locations: [url],
      periods: [],
      isLive: false,
      duration: Infinity,
      adaptations: null,
    };

    return Observable.of({ manifest, url });
  },
};

export default () => ({
  manifest: manifestPipeline,
});
