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
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
/**
 * Extends a capabilities array with others.
 * @param {Array<Object>} target
 * @param {Array<Object>} objects
 * @returns {Array.<Object>}
 */
export function extend(target, objects) {
    objects.forEach((obj) => {
        obj.forEach((element) => {
            if (typeof element === "string") {
                if (arrayFind(target, (targetElement) => targetElement === element) === undefined) {
                    target.push(element);
                }
            }
            else {
                const entry = Object.entries(element)[0];
                const [key, value] = entry;
                const foundTargetElement = arrayFind(target, (targetElement) => typeof targetElement !== "string" &&
                    targetElement[key] !== undefined &&
                    targetElement[key].length > 0);
                if (foundTargetElement === undefined) {
                    const toPush = {};
                    toPush[key] = extend([], [value]);
                    target.push(toPush);
                }
                else {
                    const targetElementToExtend = foundTargetElement;
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
export function filterConfigurationWithCapabilities(capabilities, configuration) {
    const probedConfig = {};
    capabilities.forEach((capability) => {
        if (typeof capability === "string") {
            if (configuration[capability] !== undefined) {
                probedConfig[capability] = configuration[capability];
            }
        }
        else {
            const [key, value] = Object.entries(capability)[0];
            const newConfiguration = configuration[key] === undefined
                ? {}
                : configuration[key];
            const subProbedConfig = filterConfigurationWithCapabilities(value, newConfiguration);
            if (Object.keys(subProbedConfig).length > 0 ||
                (!isNullOrUndefined(configuration[key]) &&
                    Object.keys(configuration[key])
                        .length === 0)) {
                probedConfig[key] = subProbedConfig;
            }
        }
    });
    return probedConfig;
}
