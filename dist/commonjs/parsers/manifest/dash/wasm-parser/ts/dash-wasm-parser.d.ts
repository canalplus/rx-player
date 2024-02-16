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
import type { IDashParserResponse, IMPDParserArguments } from "../../parsers_types";
export default class DashWasmParser {
    /**
     * Current "status" of the DASH-WASM parser.
     *
     * Can be either:
     *   - "uninitialized": Its `initialize` method hasn't been called yet.
     *   - "initializing": The `DashWasmParser` is in the process of fetching
     *     and instantiating the WebAssembly code.
     *   - "initialized": The `DashWasmParser` is ready to parse.
     *   - "failure": The `DashWasmParser` initialization failed.
     */
    status: "uninitialized" | "initializing" | "initialized" | "failure";
    /**
     * Promise used to notify of the initialization status.
     * `null` when no initialization has happened yet.
     */
    private _initProm;
    /** Abstraction simplifying the exploitation of the DASH-WASM parser's events. */
    private _parsersStack;
    /**
     * Created WebAssembly instance.
     * `null` when no WebAssembly instance is created.
     */
    private _instance;
    /**
     * Information about the data read by the DASH-WASM parser.
     * `null` if we're not parsing anything for the moment.
     */
    private _mpdData;
    /**
     * Warnings event currently encountered during parsing.
     * Emptied when no parsing is taking place.
     */
    private _warnings;
    /**
     * Memory used by the WebAssembly instance.
     * `null` when no WebAssembly instance is created.
     */
    private _linearMemory;
    /**
     * `true` if we're currently parsing a MPD.
     * Used to explicitely forbid parsing a MPD when a parsing operation is
     * already pending, as the current logic cannot handle that.
     *
     * Note that this is not needed for now because parsing should happen
     * synchronously.
     * Still, this property was added to make it much more explicit, in case of
     * future improvements.
     */
    private _isParsing;
    /**
     * Create a new `DashWasmParser`.
     */
    constructor();
    /**
     * Returns Promise that will resolve when the initialization has ended (either
     * with success, in which cases the Promise resolves, either with failure, in
     * which case it rejects the corresponding error).
     *
     * This is actually the exact same Promise than the one returned by the first
     * `initialize` call.
     *
     * If that method was never called, returns a rejecting Promise.
     * @returns {Promise}
     */
    waitForInitialization(): Promise<void>;
    initialize(opts: IDashWasmParserOptions): Promise<void>;
    /**
     * @param {Document} manifest - Original manifest as returned by the server
     * @param {Object} args
     * @returns {Object}
     */
    runWasmParser(mpd: ArrayBuffer, args: IMPDParserArguments): IDashParserResponse<string> | IDashParserResponse<ArrayBuffer>;
    /**
     * Return `true` if the current plaform is compatible with WebAssembly and the
     * TextDecoder interface (for faster UTF-8 parsing), which are needed features
     * for the `DashWasmParser`.
     * @returns {boolean}
     */
    isCompatible(): boolean;
    private _parseMpd;
    private _parseXlink;
    /**
     * Handle `parseMpdIr` return values, asking for resources if they are needed
     * and pre-processing them before continuing parsing.
     *
     * @param {Object} initialRes
     * @returns {Object}
     */
    private _processParserReturnValue;
}
/** Options needed when constructing the DASH-WASM parser. */
export interface IDashWasmParserOptions {
    wasmUrl: string | ArrayBuffer;
}
