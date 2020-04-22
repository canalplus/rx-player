import "@babel/polyfill";
import React from "react";
import ReactDOM from "react-dom";
import Main from "./controllers/Main.jsx";

window.onload = function() {
  ReactDOM.render(<Main />, document.getElementById("player-container"));
}
