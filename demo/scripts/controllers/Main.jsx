const React = require("react");
const Title = require("../components/Title.jsx");
const Player = require("./Player.jsx");

const Main = () => (
  <div>
    <Title title="Rx Player Demo" />
    <Player />
  </div>
);

module.exports = Main;
