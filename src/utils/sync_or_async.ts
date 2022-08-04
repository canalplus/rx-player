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
 * Type wrapping an underlying value that might either be obtained synchronously
 * (a "sync" value) or asynchronously by awaiting a Promise (an "async" value).
 *
 * This type was created instead of just relying on Promises everytime, to
 * avoid the necessity of always having the overhead and more complex
 * always-async behavior of a Promise for a value that might be in most time
 * obtainable synchronously.
 *
 * @example
 * ```ts
 * const val1 = SyncOrAsync.createAsync(Promise.resolve("foo"));
 * const val2 = SyncOrAsync.createSync("bar");
 *
 * async function logVal(val : ISyncOrAsyncValue<String>) : void {
 *   // The following syntax allows to only await asynchronous values
 *   console.log(val.syncValue ?? await val.getValueAsAsync());
 * }
 *
 * logVal(val1);
 * logVal(val2);
 *
 * // Here this will first log in the console "bar" directly and synchronously.
 * // Then asychronously through a microtask (as Promises and awaited values
 * // always are), "foo" will be logged.
 * ```
 */
export interface ISyncOrAsyncValue<T> {
  /**
   * Set to the underlying value in the case where it was set synchronously.
   * Set to `null` if the value is set asynchronously.
   */
  syncValue : T | null;
  /**
   * Obtain the value asynchronously.
   * This works even when the value is actually set synchronously, by embedding it
   * value in a Promise.
   */
  getValueAsAsync() : Promise<T>;
}

export default {
  createSync<T>(val : T) : ISyncOrAsyncValue<T> {
    return {
      syncValue: val,
      getValueAsAsync() { return Promise.resolve(val); },
    };
  },

  createAsync<T>(val : Promise<T>) : ISyncOrAsyncValue<T> {
    return {
      syncValue: null,
      getValueAsAsync() { return val; },
    };
  },
};
