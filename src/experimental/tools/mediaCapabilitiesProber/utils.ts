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

import arrayFind from "../../../utils/array_find";
import {
  ICapabilities,
  IMediaConfiguration
} from "./types";

/**
 * Extends a capabilities array with others.
 * @param {Array<Object>} target
 * @param {Array<Object>} objects
 * @returns {Array.<Object>}
 */
export function extend(target: ICapabilities, objects: ICapabilities[]): ICapabilities {
  objects.forEach((obj) => {
    obj.forEach((element) => {
      if (typeof element === "string") {
        if (
          arrayFind(target, (targetElement) => targetElement === element) === undefined
        ) {
          target.push(element);
        }
      } else {
        const entry = Object.entries(element)[0];
        const [ key, value ] = entry;
        const foundTargetElement = arrayFind(target, (targetElement) =>
          typeof targetElement !== "string" &&
          targetElement[key] !== undefined &&
          targetElement[key].length > 0
        ) as (
          undefined|
          {
            [key: string]: ICapabilities;
          }
        );
        if (foundTargetElement === undefined) {
          const toPush: { [key: string]: ICapabilities } = {};
          toPush[key] = extend([], [value]);
          target.push(toPush);
        } else {
          const targetElementToExtend: {
            [key: string]: ICapabilities;
          } = foundTargetElement;
          targetElementToExtend[key] = extend(targetElementToExtend[key], [value]);
        }
      }
    });
  });
  return target;
}

/**
 * From input config object and probed capabilities, create
 * probed configuration object.
 * @param {Array<Object>} capabilities
 * @param {Object} configuration
 * @returns {Object}
 */
export function filterConfigurationWithCapabilities(
  capabilities: ICapabilities,
  configuration: IMediaConfiguration
): IMediaConfiguration {
  const probedConfig = {};

  capabilities.forEach((capability) => {
    if (typeof capability === "string") {
      if ((configuration as {
        [id: string]: string|IMediaConfiguration;
      })[capability] !== undefined) {
        (probedConfig as {[id: string]: string|IMediaConfiguration})[capability] =
          (configuration as {[id: string]: string|IMediaConfiguration})[capability];
      }
    } else {
      const [ key, value ] = Object.entries(capability)[0];
      const newConfiguration =
        (configuration as {[id: string]: IMediaConfiguration})[key] === undefined ?
          {} :
          (configuration as {[id: string]: IMediaConfiguration})[key];
      const subProbedConfig = filterConfigurationWithCapabilities(
        value, newConfiguration);
      if (
        Object.keys(subProbedConfig).length > 0 ||
        (
          (configuration as {[id: string]: IMediaConfiguration})[key] != null &&
          Object.keys(
            (configuration as {[id: string]: IMediaConfiguration})[key]
          ).length === 0
        )
      ) {
        (probedConfig as {[id: string]: IMediaConfiguration})[key] = subProbedConfig;
      }
    }
  });

  return probedConfig;
}
