// load chai plugins
var chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-spies"));

// /core
require("./core/player.test");
require("./core/ranges.test");
require("./core/time-fragment.test");
require("./core/index-handler.test");

// /net
require("./net/smooth/parser.test");
require("./net/smooth/tt-sami.test");
require("./net/smooth/tt-ttml.test");
require("./net/dash/parser.test");
