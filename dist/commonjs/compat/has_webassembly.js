"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * If `true` the current environment support known WebAssembly API to
 * instantiate a WebAssembly module.
 */
var hasWebassembly = typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
exports.default = hasWebassembly;
