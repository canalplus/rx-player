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

import isEmpty from "./isEmpty";

export default function filterEmptyFields(object: object) {
  const filtered: {[id: string]: object} = {};
  const entries = Object.entries(object);
  for (const entry of entries) {
    const [key, value] = entry;
    if (typeof value !== "object" && value != null) {
      filtered[key] = value;
    } else if (typeof value === "object") {
      const filteredValue = filterEmptyFields(value);
      if (filteredValue && !isEmpty(filteredValue)) {
        filtered[key] = filteredValue;
      }
    }
  }
  return filtered;
}
