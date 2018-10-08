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

import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import {
  isKnownError,
  OtherError,
} from "../../errors";
import {
  ITransportPipeline,
} from "../../net/types";

export default function createParser<T, U>(
  transportPipeline : ITransportPipeline
) : (args : T) => Observable<U> {
  const parser : (x : T) => Observable<U> = transportPipeline.parser as any;
  return function parse(parserArguments : T) {
    return parser(parserArguments)
      .pipe(catchError((error) => {
        const formattedError = isKnownError(error) ?
          error : new OtherError("PIPELINE_PARSING_ERROR", error, true);
        throw formattedError;
      }));
  };
}
