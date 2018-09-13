import React from "react";
import Title from "../components/Title.jsx";
import Player from "./Player.jsx";

export default () => (
  <div>
    <div class="nav-header">
      <Title title={"Rx-Player v" + window.RxPlayer.version} />
      <div class="github-buttons">
        <a class="github-button" href="https://github.com/canalplus/rx-player" data-size="large" data-icon="octicon-star" data-show-count="true" aria-label="Star canalplus/rx-player on GitHub">Star</a>
        <a class="github-button" href="https://github.com/canalplus/rx-player/fork" data-size="large" aria-label="Fork canalplus/rx-player on GitHub">Fork</a>
      </div>
    </div>
    <Player />
  </div>
);
