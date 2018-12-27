require("@babel/polyfill"); // required for some old targets (e.g. IE11)

/**
 * Require all files returned by a require.context call
 * @param {Function} requireContext - Return of a require.context.
 * @return {Array} - Array containing every modules.
 */
function requireAll(requireContext) {
  return requireContext.keys().forEach(requireContext);
}

// require all modules ending in ".test.js" from the
// core directory and all subdirectories
requireAll(require.context("../../src", true, /\.test\.ts/));
