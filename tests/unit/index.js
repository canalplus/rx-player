// load chai plugins
import chai from "chai";

import ChaiSpies from "chai-spies";
import SinonChai from "sinon-chai";

chai.use(ChaiSpies);
chai.use(SinonChai);

/**
 * Require all files returned by a require.context call
 * @param {Function} requireContext - Return of a require.context.
 * @return {Array} - Array containing every modules.
 */
const requireAll = function(requireContext) {
  return requireContext.keys().forEach(requireContext);
};

// require all modules ending in ".test.js" from the
// core directory and all subdirectories
requireAll(require.context("../../src", true, /\.test\.ts/));
