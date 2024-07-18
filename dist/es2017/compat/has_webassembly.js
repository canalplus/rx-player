/**
 * If `true` the current environment support known WebAssembly API to
 * instantiate a WebAssembly module.
 */
const hasWebassembly = typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
export default hasWebassembly;
