// import polyfills
import "core-js/stable";

// import runtime for generators and async/await
import "regenerator-runtime/runtime";

import React from "react";
import ReactDOM from "react-dom/client";
import Main from "./controllers/Main.jsx";

window.onload = function() {
  const root = ReactDOM.createRoot(document.getElementById("player-container"));
  root.render(<Main />);
};
