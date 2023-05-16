import RxPlayer from "../../../../src/minimal";
import * as React from "react";
import GitHubButton from "../components/GitHubButton";
import Player from "./Player";

function MainComponent(): JSX.Element {
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
          <GitHubButton
            href="https://github.com/canalplus/rx-player"
            ariaLabel="Star the RxPlayer on GitHub"
            dataIcon="octicon-star"
            dataShowCount="true"
            dataText="Star"
          />
          <GitHubButton
            href="https://github.com/canalplus/rx-player/fork"
            ariaLabel="Fork the RxPlayer on GitHub"
            dataIcon="octicon-repo-forked"
            dataText="Fork"
          />
        </div>
      </div>
      <Player />
    </div>
  );
}

export default MainComponent;
