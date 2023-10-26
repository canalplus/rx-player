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
 * This file exports a Player class with a default feature set.
 * This is the class used from a regular build.
 */

import isDebugModeEnabled from "./compat/is_debug_mode_enabled";
import Player from "./core/api";
import initializeFeatures from "./features/initialize_features";
import logger from "./log";

initializeFeatures();

if (isDebugModeEnabled()) {
  logger.setLevel("DEBUG");
} else if (__ENVIRONMENT__.CURRENT_ENV as number === __ENVIRONMENT__.DEV as number) {
  logger.setLevel(__LOGGER_LEVEL__.CURRENT_LEVEL);
}

export default Player;
