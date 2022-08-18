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
 * This file exports a MinimalPlayer class for which features can be lazy-loaded.
 *
 * This allows to import a "minimal" player with a small bundle size and then
 * import only features that is needed.
 */

import logger from "./common/log";
import Player from "./worker/core/api";
import {
  addFeatures,
  IFeature,
} from "./worker/features";

if (typeof __RX_PLAYER_DEBUG_MODE__ === "boolean" && __RX_PLAYER_DEBUG_MODE__) {
  logger.setLevel("DEBUG");
} else if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV as number) {
  logger.setLevel(__LOGGER_LEVEL__.CURRENT_LEVEL);
}

/**
 * Minimal Player for which you can features at will:
 *   - start with no features
 *   - Allow to only load features wanted
 *
 * @class MinimalPlayer
 */
export default class MinimalPlayer extends Player {
  static addFeatures(featureList : IFeature[]) : void {
    addFeatures(featureList);
  }
}
