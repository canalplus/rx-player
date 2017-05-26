// load chai plugins
const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-spies"));
chai.use(require("sinon-chai"));

/**
 * Require all files returned by a require.context call
 * @param {Function} requireContext - Return of a require.context.
 * @return {Array} - Array containing every modules.
 */
const requireAll = function(requireContext) {
  return requireContext.keys().forEach(requireContext);
};

// require all modules ending in "-test.js" from the
// core directory and all subdirectories
requireAll(require.context("../../src", true, /\.test\.js$/));
