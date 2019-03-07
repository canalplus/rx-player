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

// examples: 00:00:40:07 (7 frames) or 00:00:40:07.1 (7 frames, 1 subframe)
const REGXP_TIME_COLON_FRAMES =
  /^(\d{2,}):(\d{2}):(\d{2}):(\d{2})\.?(\d+)?$/;

// examples: 00:00:40:07 (7 frames) or 00:00:40:07.1 (7 frames, 1 subframe)
const REGXP_TIME_COLON = /^(?:(\d{2,}):)?(\d{2}):(\d{2})$/;

// examples: 01:02:43.0345555 or 02:43.03
const REGXP_TIME_COLON_MS = /^(?:(\d{2,}):)?(\d{2}):(\d{2}\.\d{2,})$/;

// examples: 75f or 75.5f
const REGXP_TIME_FRAMES = /^(\d*\.?\d*)f$/;

// examples: 50t or 50.5t
const REGXP_TIME_TICK = /^(\d*\.?\d*)t$/;

// examples: 3.45h, 3m or 4.20s
const REGXP_TIME_HMS =
  /^(?:(\d*\.?\d*)h)?(?:(\d*\.?\d*)m)?(?:(\d*\.?\d*)s)?(?:(\d*\.?\d*)ms)?$/;

// examples: 50% 10%
const REGXP_PERCENT_VALUES = /^(\d{1,2}|100)% (\d{1,2}|100)%$/;

const REGXP_8_HEX_COLOR =
  /^#([0-9A-f]{2})([0-9A-f]{2})([0-9A-f]{2})([0-9A-f]{2})$/;
const REGXP_4_HEX_COLOR = /^#([0-9A-f])([0-9A-f])([0-9A-f])([0-9A-f])$/;

export {
  REGXP_PERCENT_VALUES,
  REGXP_TIME_COLON,
  REGXP_TIME_COLON_FRAMES,
  REGXP_TIME_COLON_MS,
  REGXP_TIME_FRAMES,
  REGXP_TIME_HMS,
  REGXP_TIME_TICK,
  REGXP_4_HEX_COLOR,
  REGXP_8_HEX_COLOR,
};
