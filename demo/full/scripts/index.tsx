// import polyfills
import "core-js/stable";

// import runtime for generators and async/await
import "regenerator-runtime/runtime";

import * as React from "react";
import * as ReactDOM from "react-dom";
import Main from "./controllers/Main";

window.onload = function() {
  ReactDOM.render(<Main />, document.getElementById("player-container"));
};
