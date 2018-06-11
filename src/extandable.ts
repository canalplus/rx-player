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
 * This file exports a Player class for which features can be lazy-loaded.
 *
 * This allows to import a "minimal" player with a small bundle size and then
 * import only features that is needed.
 */

import Player from "./core/api";
import addFeatures from "./features/add_features";
import { IFeatureListItem } from "./features/types";
import logger from "./utils/log";

if (__DEV__) {
  logger.setLevel(__LOGGER_LEVEL__);
}

/**
 * Extandable Player for which you can features at will.
 *
 * Allow to only loads features that you needs at the moment you need them.
 */
export default class ExtendablePlayer extends Player {
  static addFeatures(featureList : IFeatureListItem[]) : void {
    addFeatures(featureList);
  }
}
