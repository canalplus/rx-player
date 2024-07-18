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
import hasWebassembly from "../../../../../compat/has_webassembly";
import log from "../../../../../log";
import { assertUnreachable } from "../../../../../utils/assert";
import globalScope from "../../../../../utils/global_scope";
import noop from "../../../../../utils/noop";
import parseMpdIr from "../../common";
import { generateRootChildrenParser } from "./generators";
import { generateXLinkChildrenParser } from "./generators/XLink";
import ParsersStack from "./parsers_stack";
const MAX_READ_SIZE = 15e3;
export default class DashWasmParser {
    /**
     * Create a new `DashWasmParser`.
     */
    constructor() {
        this._parsersStack = new ParsersStack();
        this._instance = null;
        this._mpdData = null;
        this._linearMemory = null;
        this.status = "uninitialized";
        this._initProm = null;
        this._warnings = [];
        this._isParsing = false;
    }
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
    waitForInitialization() {
        var _a;
        return (_a = this._initProm) !== null && _a !== void 0 ? _a : Promise.reject("No initialization performed yet.");
    }
    async initialize(opts) {
        if (this.status !== "uninitialized") {
            return Promise.reject(new Error("DashWasmParser already initialized."));
        }
        else if (!this.isCompatible()) {
            this.status = "failure";
            return Promise.reject(new Error("Target not compatible with WebAssembly."));
        }
        this.status = "initializing";
        const parsersStack = this._parsersStack;
        /** Re-used TextDecoder instance. */
        const textDecoder = new TextDecoder();
        /* eslint-disable @typescript-eslint/no-this-alias */
        const self = this;
        /* eslint-enable @typescript-eslint/no-this-alias */
        const imports = {
            env: {
                memoryBase: 0,
                tableBase: 0,
                memory: new WebAssembly.Memory({ initial: 10 }),
                table: new WebAssembly.Table({ initial: 1, element: "anyfunc" }),
                onTagOpen,
                onCustomEvent,
                onAttribute,
                readNext,
                onTagClose,
            },
        };
        let objectUrl = null;
        let fetchedWasm;
        if (typeof opts.wasmUrl === "string") {
            fetchedWasm = fetch(opts.wasmUrl);
        }
        else {
            objectUrl = URL.createObjectURL(new Blob([opts.wasmUrl], { type: "application/wasm" }));
            fetchedWasm = fetch(objectUrl);
        }
        const streamingProm = typeof WebAssembly.instantiateStreaming === "function"
            ? WebAssembly.instantiateStreaming(fetchedWasm, imports)
            : Promise.reject("`WebAssembly.instantiateStreaming` API not available");
        this._initProm = streamingProm
            .catch(async (e) => {
            if (objectUrl !== null) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
            log.warn("Unable to call `instantiateStreaming` on WASM", e instanceof Error ? e : "");
            const res = await fetchedWasm;
            if (res.status < 200 || res.status >= 300) {
                throw new Error("WebAssembly request failed. status: " + String(res.status));
            }
            const resAb = await res.arrayBuffer();
            return WebAssembly.instantiate(resAb, imports);
        })
            .then((instanceWasm) => {
            if (objectUrl !== null) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
            this._instance = instanceWasm;
            // TODO better types?
            this._linearMemory = this._instance.instance.exports.memory;
            this.status = "initialized";
        })
            .catch((err) => {
            const message = err instanceof Error ? err.toString() : "Unknown error";
            log.warn("DW: Could not create DASH-WASM parser:", message);
            this.status = "failure";
            throw err;
        });
        return this._initProm;
        /**
         * Callback called when a new Element has been encountered by the WASM parser.
         * @param {number} tag - Identify the tag encountered (@see TagName)
         */
        function onTagOpen(tag) {
            // Call the active "childrenParser"
            return parsersStack.childrenParser(tag);
        }
        /**
         * Callback called when an open Element's ending tag has been encountered by
         * the WASM parser.
         * @param {number} tag - Identify the tag in question (@see TagName)
         */
        function onTagClose(tag) {
            // Only pop current parsers from the `parsersStack` if that tag was the
            // active one.
            return parsersStack.popIfCurrent(tag);
        }
        /**
         * Callback called each time a new Element's attribute is encountered by
         * the WASM parser.
         *
         * TODO Merge all attributes into the same callback with `onTagOpen`? I
         * tried but there's some difficulties if doing that.
         *
         * @param {number} attr - Identify the Attribute in question (@see TagName)
         * @param {number} ptr - Pointer to the first byte containing the
         * attribute's data in the WebAssembly's linear memory.
         * @param {number} len - Length of the attribute's value, in bytes.
         */
        function onAttribute(attr, ptr, len) {
            // Call the active "attributeParser"
            return parsersStack.attributeParser(attr, ptr, len);
        }
        /**
         * Callback called on the various "custom events" triggered by the WASM.
         *
         * @see CustomEventType
         * @param {number} evt - The type of the event
         * @param {number} ptr - Pointer to the first byte of the event's payload in
         * the WebAssembly's linear memory.
         * @param {number} len - Length of the payload, in bytes.
         */
        function onCustomEvent(evt, ptr, len) {
            const linearMemory = self._linearMemory;
            const arr = new Uint8Array(linearMemory.buffer, ptr, len);
            if (evt === 1 /* CustomEventType.Error */) {
                const decoded = textDecoder.decode(arr);
                log.warn("WASM Error Event:", decoded);
                self._warnings.push(new Error(decoded));
            }
            else if (evt === 0 /* CustomEventType.Log */) {
                const decoded = textDecoder.decode(arr);
                log.warn("WASM Log Event:", decoded);
            }
        }
        /**
         * Callback called by the WebAssembly when it needs to read new data from
         * the MPD.
         *
         * @param {number} ptr - First byte offset, in the WebAssembly's linear
         * memory, where the MPD should be set (under an array of bytes form).
         * @param {number} wantedSize - Size of the data, in bytes, asked by the
         * WebAssembly parser. It might receive less depending on if there's less
         * data in the MPD or if it goes over the set maximum size it could read
         * at a time.
         * @returns {number} - Return the number of bytes effectively read and set
         * in WebAssembly's linear memory (at the `ptr` offset).
         */
        function readNext(ptr, wantedSize) {
            if (self._mpdData === null) {
                throw new Error("DashWasmParser Error: No MPD to read.");
            }
            const linearMemory = self._linearMemory;
            const { mpd, cursor } = self._mpdData;
            const sizeToRead = Math.min(wantedSize, MAX_READ_SIZE, mpd.byteLength - cursor);
            const arr = new Uint8Array(linearMemory.buffer, ptr, sizeToRead);
            arr.set(new Uint8Array(mpd, cursor, sizeToRead));
            self._mpdData.cursor += sizeToRead;
            return sizeToRead;
        }
    }
    /**
     * @param {Document} manifest - Original manifest as returned by the server
     * @param {Object} args
     * @returns {Object}
     */
    runWasmParser(mpd, args) {
        const [mpdIR, warnings] = this._parseMpd(mpd);
        if (mpdIR === null) {
            throw new Error("DASH Parser: Unknown error while parsing the MPD");
        }
        const ret = parseMpdIr(mpdIR, args, warnings);
        return this._processParserReturnValue(ret);
    }
    /**
     * Return `true` if the current plaform is compatible with WebAssembly and the
     * TextDecoder interface (for faster UTF-8 parsing), which are needed features
     * for the `DashWasmParser`.
     * @returns {boolean}
     */
    isCompatible() {
        return hasWebassembly && typeof globalScope.TextDecoder === "function";
    }
    _parseMpd(mpd) {
        var _a;
        if (this._instance === null) {
            throw new Error("DashWasmParser not initialized");
        }
        if (this._isParsing) {
            throw new Error("Parsing operation already pending.");
        }
        this._isParsing = true;
        this._mpdData = { mpd, cursor: 0 };
        const rootObj = {};
        const linearMemory = this._linearMemory;
        const rootChildrenParser = generateRootChildrenParser(rootObj, linearMemory, this._parsersStack, mpd);
        this._parsersStack.pushParsers(null, rootChildrenParser, noop);
        this._warnings = [];
        try {
            // TODO better type this
            this._instance.instance.exports.parse();
        }
        catch (err) {
            this._parsersStack.reset();
            this._warnings = [];
            this._isParsing = false;
            throw err;
        }
        const parsed = (_a = rootObj.mpd) !== null && _a !== void 0 ? _a : null;
        const warnings = this._warnings;
        this._parsersStack.reset();
        this._warnings = [];
        this._isParsing = false;
        return [parsed, warnings];
    }
    _parseXlink(xlinkData) {
        if (this._instance === null) {
            throw new Error("DashWasmParser not initialized");
        }
        if (this._isParsing) {
            throw new Error("Parsing operation already pending.");
        }
        this._isParsing = true;
        this._mpdData = { mpd: xlinkData, cursor: 0 };
        const rootObj = {
            periods: [],
        };
        const linearMemory = this._linearMemory;
        const xlinkParser = generateXLinkChildrenParser(rootObj, linearMemory, this._parsersStack, xlinkData);
        this._parsersStack.pushParsers(null, xlinkParser, noop);
        this._warnings = [];
        try {
            // TODO better type this
            this._instance.instance.exports.parse();
        }
        catch (err) {
            this._parsersStack.reset();
            this._warnings = [];
            this._isParsing = false;
            throw err;
        }
        const { periods } = rootObj;
        const warnings = this._warnings;
        this._parsersStack.reset();
        this._warnings = [];
        this._isParsing = false;
        return [periods, warnings];
    }
    /**
     * Handle `parseMpdIr` return values, asking for resources if they are needed
     * and pre-processing them before continuing parsing.
     *
     * @param {Object} initialRes
     * @returns {Object}
     */
    _processParserReturnValue(initialRes) {
        if (initialRes.type === "done") {
            return initialRes;
        }
        else if (initialRes.type === "needs-clock") {
            const continueParsingMPD = (loadedClock) => {
                if (loadedClock.length !== 1) {
                    throw new Error("DASH parser: wrong number of loaded ressources.");
                }
                const newRet = initialRes.value.continue(loadedClock[0].responseData);
                return this._processParserReturnValue(newRet);
            };
            return {
                type: "needs-resources",
                value: {
                    urls: [initialRes.value.url],
                    format: "string",
                    continue: continueParsingMPD,
                },
            };
        }
        else if (initialRes.type === "needs-xlinks") {
            const continueParsingMPD = (loadedXlinks) => {
                const resourceInfos = [];
                for (let i = 0; i < loadedXlinks.length; i++) {
                    const { responseData: xlinkResp, receivedTime, sendingTime, url, } = loadedXlinks[i];
                    if (!xlinkResp.success) {
                        throw xlinkResp.error;
                    }
                    const [periodsIr, periodsIRWarnings] = this._parseXlink(xlinkResp.data);
                    resourceInfos.push({
                        url,
                        receivedTime,
                        sendingTime,
                        parsed: periodsIr,
                        warnings: periodsIRWarnings,
                    });
                }
                const newRet = initialRes.value.continue(resourceInfos);
                return this._processParserReturnValue(newRet);
            };
            return {
                type: "needs-resources",
                value: {
                    urls: initialRes.value.xlinksUrls,
                    format: "arraybuffer",
                    continue: continueParsingMPD,
                },
            };
        }
        else {
            assertUnreachable(initialRes);
        }
    }
}
