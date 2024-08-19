// import polyfills
import "core-js/stable";

// import runtime for generators and async/await
import "regenerator-runtime/runtime";

import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Main from "./controllers/Main";

window.onload = function (): void {
  const rootElt = document.getElementById("player-container");
  if (rootElt === null) {
    // eslint-disable-next-line no-console
    console.error("Error: missing `player-container` element");
    return;
  }
  const root = ReactDOM.createRoot(rootElt);
  root.render(
    <React.StrictMode>
      <Main />
    </React.StrictMode>,
  );
};
