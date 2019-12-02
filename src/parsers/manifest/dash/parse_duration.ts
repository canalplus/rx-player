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

import { IParsedPeriod } from "../types";
import { IMPDAttributes } from "./node_parsers/MPD";

export default function parseDuration(
  rootAttributes : IMPDAttributes,
  parsedPeriods : IParsedPeriod[]
) : number|undefined {
  if (rootAttributes.duration !== undefined) {
    const firstPosition = parsedPeriods.reduce((acc: number|undefined, { start }) => {
      return acc !== undefined ? Math.min(acc, start) : start;
    }, undefined);
    return rootAttributes.duration - (firstPosition ?? 0);
  }
  if (rootAttributes.type === "dynamic" || parsedPeriods.length === 0) {
    return undefined;
  }
  const lastPeriod = parsedPeriods[parsedPeriods.length - 1];
  const lastPeriodEnd = lastPeriod.end ??
    (lastPeriod.duration !== undefined ? lastPeriod.duration + lastPeriod.start :
                                                               undefined);
  if (lastPeriodEnd !== undefined) {
    const firstPosition = parsedPeriods.reduce((acc: number|undefined, { start }) => {
      return acc !== undefined ? Math.min(acc, start) : start;
    }, undefined);
    return lastPeriodEnd - (firstPosition ?? 0);
  }
  return undefined;
}
