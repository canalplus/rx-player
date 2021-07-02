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

import PPromise from "pinkie";
import log from "../../../../../log";
import assertUnreachable from "../../../../../utils/assert_unreachable";
import noop from "../../../../../utils/noop";
import parseMpdIr, {
  IIrParserResponse,
  ILoadedXlinkData,
} from "../../common";
import {
  IMPDIntermediateRepresentation, IPeriodIntermediateRepresentation,
} from "../../node_parser_types";
import {
  IDashParserResponse,
  ILoadedResource,
  IMPDParserArguments,
} from "../../parsers_types";
import { generateRootChildrenParser } from "./generators";
import { generateXLinkChildrenParser } from "./generators/XLink";
import ParsersStack from "./parsers_stack";
import {
  AttributeName,
  CustomEventType,
  TagName,
} from "./types";

const MAX_READ_SIZE = 15e3;

export interface IMPDParserInstance {
  parseNextChunk(data : ArrayBuffer) : void;
  abort() : void;
  end(args : IMPDParserArguments) : IDashParserResponse<string> |
                                    IDashParserResponse<ArrayBuffer>;
}

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
  public status : "uninitialized" |
                  "initializing" |
                  "initialized" |
                  "failure";


  /**
   * XXX TODO
   * `true` if we're currently parsing a MPD.
   * Used to explicitely forbid parsing a MPD when a parsing operation is
   * already pending, as the current logic cannot handle that.
   *
   * Note that this is not needed for now because parsing should happen
   * synchronously.
   * Still, this property was added to make it much more explicit, in case of
   * future improvements.
   */
  private _parsingContext : {
    processorId : number;
    /**
     * Created WebAssembly instance.
     * `null` when no WebAssembly instance is created.
     */
    instance : WebAssembly.WebAssemblyInstantiatedSource;
    /**
     * Information about the data read by the DASH-WASM parser.
     * `null` if we're not parsing anything for the moment.
     */
    mpdData : {
      /**
       * First not-yet read position in `mpd`, in bytes.
       * When the parser asks for new data, we start giving data from that point
       * on.
       */
      cursor : number;
      /**
       * XXX TODO
       * Complete data that needs to be parsed.
       * This is either the full MPD or xlinks.
       */
      mpdChunks : ArrayBuffer[];
    };
    /**
     * Warnings event currently encountered during parsing.
     * Emptied when no parsing is taking place.
     */
    warnings : Error[];
    /**
     * Memory used by the WebAssembly instance.
     * `null` when no WebAssembly instance is created.
     */
    linearMemory : WebAssembly.Memory | null;
  } | null;

  /** Abstraction simplifying the exploitation of the DASH-WASM parser's events. */
  private _parsersStack : ParsersStack;

  /**
   * Promise used to notify of the initialization status.
   * `null` when no initialization has happened yet.
   */
  private _initProm : Promise<void> | null;
  /**
   * Created WebAssembly instance.
   * `null` when no WebAssembly instance is created.
   */
  private _instance : WebAssembly.WebAssemblyInstantiatedSource | null;

  /**
   * Create a new `DashWasmParser`.
   * @param {object} opts
   */
  constructor() {
    this._parsersStack = new ParsersStack();
    this._instance = null;
    this.status = "uninitialized";
    this._initProm = null;
    this._parsingContext = null;
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
  public waitForInitialization() : Promise<void> {
    return this._initProm ??
           PPromise.reject("No initialization performed yet.");
  }

  public async initialize(opts : IDashWasmParserOptions) : Promise<void> {
    if (this.status !== "uninitialized") {
      return PPromise.reject(new Error("DashWasmParser already initialized."));
    } else if (!this.isCompatible()) {
      this.status = "failure";
      return PPromise.reject(new Error("Target not compatible with WebAssembly."));
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

    const fetchedWasm = fetch(opts.wasmUrl);

    const streamingProm = typeof WebAssembly.instantiateStreaming === "function" ?
      WebAssembly.instantiateStreaming(fetchedWasm, imports) :
      PPromise.reject("`WebAssembly.instantiateStreaming` API not available");

    let linearMemory : WebAssembly.Memory;
    this._initProm = streamingProm
      .catch(async (e) => {
        log.warn("Unable to call `instantiateStreaming` on WASM:", e);
        const res = await fetchedWasm;
        if (res.status < 200 || res.status >= 300) {
          throw new Error("WebAssembly request failed. status: " + String(res.status));
        }
        const resAb = await res.arrayBuffer();
        return WebAssembly.instantiate(resAb, imports);
      })
      .then((instanceWasm) => {
        this._instance = instanceWasm;

        // TODO better types?
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        linearMemory = (this._instance.instance.exports as any).memory;
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */

        this.status = "initialized";
      }).catch((err : Error) => {
        const message = err instanceof Error ? err.toString() :
                                               "Unknown error";
        log.warn("DW: Could not create DASH-WASM parser:", message);
        this.status = "failure";
      });

    return this._initProm;

    /**
     * Callback called when a new Element has been encountered by the WASM parser.
     * @param {number} tag - Identify the tag encountered (@see TagName)
     */
    function onTagOpen(tag : TagName) : void {
      window.bloup.tags.push(tag);
      // Call the active "childrenParser"
      return parsersStack.childrenParser(tag);
    }

    /**
     * Callback called when an open Element's ending tag has been encountered by
     * the WASM parser.
     * @param {number} tag - Identify the tag in question (@see TagName)
     */
    function onTagClose(tag : TagName) : void {
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
    function onAttribute(attr : AttributeName, ptr : number, len : number) : void {
      window.bloup.attributes.push({ attr,
                                     val: linearMemory.buffer.slice(ptr, ptr + len) });
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
    function onCustomEvent(evt : CustomEventType, ptr : number, len : number) : void {
      if (self._parsingContext === null)  {
        throw new Error("DashWasmParser Error: No parsing operation is pending.");
      }
      const arr = new Uint8Array(linearMemory.buffer, ptr, len);
      if (evt === CustomEventType.Error) {
        const decoded = textDecoder.decode(arr);
        log.warn("WASM Error Event:", decoded);
        self._parsingContext.warnings.push(new Error(decoded));
      } else if (evt === CustomEventType.Log) {
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
    function readNext(ptr : number, wantedSize : number) : number {
      if (self._parsingContext === null)  {
        throw new Error("DashWasmParser Error: No MPD to read.");
      }
      const mpdData = self._parsingContext.mpdData;
      let mpd = mpdData.mpdChunks[0];
      if (mpd === undefined) {
        return 0;
      }
      if (mpdData.cursor >= mpd.byteLength) {
        mpdData.mpdChunks.shift();
        mpdData.cursor = 0;
        if (mpdData.mpdChunks.length === 0) {
          return 0;
        }
        mpd = mpdData.mpdChunks[0];
      }
      const sizeToRead = Math.min(wantedSize,
                                  MAX_READ_SIZE,
                                  mpd.byteLength - mpdData.cursor);
      const arr = new Uint8Array(linearMemory.buffer, ptr, sizeToRead);
      arr.set(new Uint8Array(mpd, mpdData.cursor, sizeToRead));
      mpdData.cursor += sizeToRead;
      window.PREV_ARR = window.ARTR ? window.ARTR.slice() : [];
      window.ARTR = mpd.slice(mpdData.cursor - sizeToRead, mpdData.cursor);
      window.bloup = { tags: [], attributes: [] };
      return sizeToRead;
    }
  }

  /**
   * @param {Document} manifest - Original manifest as returned by the server
   * @param {Object} args
   * @returns {Object}
   */
  public createMpdParser() : IMPDParserInstance {
    if (this._instance === null) {
      throw new Error("DashWasmParser not initialized");
    }
    if (this._parsingContext !== null) {
      throw new Error("Parsing operation already pending.");
    }
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const exports = (this._instance.instance.exports as any);
    const processor : number = (this._instance.instance.exports as any)
      .create_processor();
    const linearMemory : WebAssembly.Memory = exports.memory;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    /* eslint-enable @typescript-eslint/no-unsafe-call */
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    this._parsingContext = {
      processorId: processor,
      instance: this._instance,
      mpdData: { mpdChunks: [], cursor: 0 },
      warnings: [],
      linearMemory,
    };
    const mpdData =  this._parsingContext.mpdData;
    const warnings = this._parsingContext.warnings;

    const rootObj : { mpd? : IMPDIntermediateRepresentation } = {};
    const rootChildrenParser = generateRootChildrenParser(rootObj,
                                                          linearMemory,
                                                          this._parsersStack);
    this._parsersStack.pushParsers(null, rootChildrenParser, noop);

    return {
      parseNextChunk: (data : ArrayBuffer) => {
        mpdData.mpdChunks.push(data);
        try {
          /* eslint-disable @typescript-eslint/no-unsafe-call */
          /* eslint-disable @typescript-eslint/no-unsafe-member-access */
          this._getWasmExports().parse_current_data(processor);
          /* eslint-enable @typescript-eslint/no-unsafe-call */
          /* eslint-enable @typescript-eslint/no-unsafe-member-access */
        } catch (err) {
          this._parsersStack.reset();
          this._freeParser();
          this._parsingContext = null;
          throw err;
        }
      },
      abort: () => {
        this._freeParser();
      },

      end: (args : IMPDParserArguments) => {
        this._freeParser();
        const parsed = rootObj.mpd ?? null;
        if (parsed === null) {
          throw new Error("DASH Parser: Unknown error while parsing the MPD");
        }
        const ret = parseMpdIr(parsed, args, warnings);
        return this._processParserReturnValue(ret);
      },
    };
  }

  /**
   * Return `true` if the current plaform is compatible with WebAssembly and the
   * TextDecoder interface (for faster UTF-8 parsing), which are needed features
   * for the `DashWasmParser`.
   * @returns {boolean}
   */
  public isCompatible() : boolean {
    return typeof WebAssembly === "object" &&
           typeof WebAssembly.instantiate === "function" &&
           typeof window.TextDecoder === "function";
  }

  private _parseXlink(
    xlinkData : ArrayBuffer
  ) : [IPeriodIntermediateRepresentation[],
       Error[]]
  {
    if (this._instance === null) {
      throw new Error("DashWasmParser not initialized");
    }
    if (this._parsingContext !== null) {
      throw new Error("Parsing operation already pending.");
    }

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const exports = (this._instance.instance.exports as any);
    const processor : number = (this._instance.instance.exports as any)
      .create_processor();
    const linearMemory : WebAssembly.Memory = exports.memory;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    /* eslint-enable @typescript-eslint/no-unsafe-call */
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    const warnings : Error[] = [];

    this._parsingContext = {
      processorId: processor,
      instance: this._instance,
      mpdData: { mpdChunks: [xlinkData], cursor: 0 },
      warnings,
      linearMemory,
    };

    const rootObj : { periods : IPeriodIntermediateRepresentation[] } =
      { periods: [] };

    const xlinkParser = generateXLinkChildrenParser(rootObj,
                                                    linearMemory,
                                                    this._parsersStack);
    this._parsersStack.pushParsers(null, xlinkParser, noop);
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-call */
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      this._getWasmExports().parse_current_data(processor);
      /* eslint-enable @typescript-eslint/no-unsafe-call */
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    } catch (err) {
      this._parsersStack.reset();
      this._freeParser();
      this._parsingContext = null;
      throw err;
    }

    const { periods } = rootObj;
    this._freeParser();
    return [periods, warnings];
  }

  private _getWasmExports() : any {
    if (this._instance === null) {
      throw new Error("DashWasmParser not initialized");
    }
    // TODO better type this
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    return (this._instance.instance.exports as any);
    /* eslint-enable @typescript-eslint/no-unsafe-return */
  }

  private _freeParser() : void {
    this._parsersStack.reset();
    if (this._parsingContext === null) {
      return ;
    }
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-call */
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      this._getWasmExports().free_processor(this._parsingContext.processorId);
      /* eslint-enable @typescript-eslint/no-unsafe-call */
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    } catch (err) {
      this._parsingContext = null;
      throw err;
    }
    this._parsingContext = null;
  }

  /**
   * Handle `parseMpdIr` return values, asking for resources if they are needed
   * and pre-processing them before continuing parsing.
   *
   * @param {Object} initialRes
   * @returns {Object}
   */
  private _processParserReturnValue(
    initialRes : IIrParserResponse
  ) : IDashParserResponse<string> | IDashParserResponse<ArrayBuffer> {
    if (initialRes.type === "done") {
      return initialRes;

    } else if (initialRes.type === "needs-clock") {
      const continueParsingMPD = (
        loadedClock : Array<ILoadedResource<string>>
      ) : IDashParserResponse<string> | IDashParserResponse<ArrayBuffer> => {
        if (loadedClock.length !== 1) {
          throw new Error("DASH parser: wrong number of loaded ressources.");
        }
        const newRet = initialRes.value.continue(loadedClock[0].responseData);
        return this._processParserReturnValue(newRet);
      };
      return { type: "needs-resources",
               value: { urls: [initialRes.value.url],
                        format: "string",
                        continue : continueParsingMPD } };

    } else if (initialRes.type === "needs-xlinks") {
      const continueParsingMPD = (
        loadedXlinks : Array<ILoadedResource<ArrayBuffer>>
      ) : IDashParserResponse<string> | IDashParserResponse<ArrayBuffer> => {
        const resourceInfos : ILoadedXlinkData[] = [];
        for (let i = 0; i < loadedXlinks.length; i++) {
          const { responseData: xlinkData,
                  receivedTime,
                  sendingTime,
                  url } = loadedXlinks[i];
          const [periodsIr,
                 periodsIRWarnings] = this._parseXlink(xlinkData);
          resourceInfos.push({ url,
                               receivedTime,
                               sendingTime,
                               parsed: periodsIr,
                               warnings: periodsIRWarnings });
        }
        const newRet = initialRes.value.continue(resourceInfos);
        return this._processParserReturnValue(newRet);
      };

      return { type: "needs-resources",
               value: { urls: initialRes.value.xlinksUrls,
                        format: "arraybuffer",
                        continue : continueParsingMPD } };
    } else {
      assertUnreachable(initialRes);
    }
  }
}

/** Options needed when constructing the DASH-WASM parser. */
export interface IDashWasmParserOptions {
  wasmUrl : string;
}
