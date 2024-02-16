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
type MergeRecursively<T extends object, S extends object[]> = S extends [
    infer First,
    ...infer Rest
] ? MergeRecursively<MergeObjects<T, First extends object ? First : never>, Rest extends object[] ? Rest : never> : T;
type MergeObjects<T extends object, S extends object> = {
    [K in OptionalPropertyOfTNotInS<T, S> | OptionalProperty<T>]?: K extends keyof S ? S[K] : K extends keyof T ? T[K] : never;
} & {
    [K in Exclude<keyof T | keyof S, OptionalPropertyOfTNotInS<T, S> | OptionalProperty<T>>]: K extends keyof S ? S[K] : K extends keyof T ? T[K] : never;
};
type OptionalProperty<T> = Exclude<{
    [K in keyof T]: T extends Record<K, T[K]> ? never : K;
}[keyof T], undefined>;
type OptionalPropertyOfTNotInS<T, S> = Exclude<{
    [K in keyof T]: T extends Record<K, T[K]> ? never : K;
}[keyof T], undefined | {
    [K in keyof S]: S extends Record<K, S[K]> ? K : never;
}[keyof S]>;
/**
 * Very simple implementation of Object.assign.
 * Should be sufficient for all use-cases here.
 *
 * Does not support symbols, but this should not be a problem as browsers
 * supporting symbols generally support Object.assign;
 *
 * @param {Object} target
 * @param {Array.<Object>} ...sources
 * @returns {Object}
 */
declare function objectAssign<T extends object, U extends object[]>(target: T, ...sources: U): MergeRecursively<T, U>;
declare const _default: typeof objectAssign;
export default _default;
