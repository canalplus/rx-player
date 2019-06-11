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

import config from "../../../config";
import { IBackoffOptions } from "./backoff";

const { MAX_BACKOFF_DELAY_BASE,
        INITIAL_BACKOFF_DELAY_BASE } = config;

export default function getBackoffOptions(
  maxRetry : number,
  maxRetryOffline : number
) : IBackoffOptions {
  return { baseDelay: INITIAL_BACKOFF_DELAY_BASE,
           maxDelay: MAX_BACKOFF_DELAY_BASE,
           maxRetryRegular: maxRetry,
           maxRetryOffline };
}
