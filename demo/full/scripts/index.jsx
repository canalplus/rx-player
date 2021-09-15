// import polyfills
import "core-js/stable";

// import runtime for generators and async/await
import "regenerator-runtime/runtime";

import React from "react";
import ReactDOM from "react-dom";
import Main from "./controllers/Main.jsx";

window.onload = function() {
  ReactDOM.render(<Main />, document.getElementById("player-container"));
};
