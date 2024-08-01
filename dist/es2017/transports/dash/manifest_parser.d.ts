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
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IManifestParserOptions, IManifestParserRequestScheduler, IManifestParserResult, IRequestedData, ITransportOptions } from "../types";
export default function generateManifestParser(options: ITransportOptions): (manifestData: IRequestedData<unknown>, parserOptions: IManifestParserOptions, onWarnings: (warnings: Error[]) => void, cancelSignal: CancellationSignal, scheduleRequest: IManifestParserRequestScheduler) => IManifestParserResult | Promise<IManifestParserResult>;
//# sourceMappingURL=manifest_parser.d.ts.map