import React from "react";
import Player from "./Player.jsx";

export default () => (
  <div>
    <div class="nav-header">
      <section className="title-wrapper">
        <h1 className="title">
          <a href="https://github.com/canalplus/rx-player">
            <img className="rxplayer-logo" alt="RxPlayer" src="./assets/logo_white.png"/>
          </a>
          <a href="https://github.com/canalplus/rx-player/releases">
            <span className="version">{" v" + window.RxPlayer.version}</span>
          </a>
        </h1>
      </section>
      <div className="header-links-buttons">
        <a href="https://www.mycanal.fr"><img className="title-logo" alt="CANAL+" src="./assets/canalp.svg"/></a>
        <span className="github-buttons">
          <a className="github-button" href="https://github.com/canalplus/rx-player" data-size="large" data-icon="octicon-star" data-show-count="true" aria-label="Star canalplus/rx-player on GitHub">Star</a>
          <a className="github-button" href="https://github.com/canalplus/rx-player/fork" data-size="large" aria-label="Fork canalplus/rx-player on GitHub">Fork</a>
        </span>
      </div>
    </div>
    <Player />
  </div>
);
