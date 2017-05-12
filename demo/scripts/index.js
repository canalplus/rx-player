require("./lib/polyfills.js");
const React = require("react");
const ReactDOM = require("react-dom");
const Main = require("./controllers/Main.jsx");

ReactDOM.render(<Main />, document.getElementById("player-container"));
