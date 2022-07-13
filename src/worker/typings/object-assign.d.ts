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

declare module "object-assign" {
  function objectAssign<T, U>(target : T, source : U) : T & U;
  function objectAssign<T, U, V>(
    target : T,
    source1 : U,
    source2 : V
  ) : T & U & V;
  function objectAssign<T, U, V, W>(
    target : T,
    source1 : U,
    source2 : V,
    source3 : W
  ) : T & U & V & W;
  function objectAssign<T, U, V, W, X>(
    target : T,
    source1 : U,
    source2 : V,
    source3 : W,
    source4 : X
  ) : T & U & V & W & X;
  function objectAssign<T, U, V, W, X, Y>(
    target : T,
    source1 : U,
    source2 : V,
    source3 : W,
    source4 : X,
    source5 : Y
  ) : T & U & V & W & Y;
  // eslint-disable-next-line @typescript-eslint/ban-types
  function objectAssign<T>(target : object, ...sources : T[]) : T;
  export default objectAssign;
}
