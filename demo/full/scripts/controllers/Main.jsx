import RxPlayer from "../../../../src/index.ts";
import React from "react";
import Player from "./Player.jsx";

function MainComponent() {
  return (
    <div>
      <div className="nav-header">
        <section className="title-wrapper">
          <h1 className="title">
            <a href="https://github.com/canalplus/rx-player">
              <img className="rxplayer-logo" alt="RxPlayer" src="./assets/logo_white.png"/>
            </a>
            <a href="https://github.com/canalplus/rx-player/releases">
              <span className="version">{" v" + RxPlayer.version}</span>
            </a>
          </h1>
        </section>
        <div className="header-links-buttons">
          <a aria-label="Go to Canal+ website" href="https://canalplus.com">
            <img className="title-logo" alt="CANAL+" src="./assets/canalp.svg"/>
          </a>
          <span className="button-gh"><a
            className="github-button"
            href="https://github.com/canalplus/rx-player"
            data-size="large"
            data-icon="octicon-star"
            data-show-count="true"
            aria-label="Star the RxPlayer on GitHub">
            Star
          </a></span>
          <span className="button-gh"><a
            className="github-button"
            href="https://github.com/canalplus/rx-player/fork"
            data-size="large"
            aria-label="Fork the RxPlayer on GitHub">
            Fork
          </a></span>
        </div>
      </div>
      <Player />
    </div>
  );
}

export default MainComponent;
