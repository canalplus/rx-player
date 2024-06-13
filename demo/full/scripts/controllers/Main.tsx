import RxPlayer from "../../../../src/minimal";
import * as React from "react";
import GitHubButton from "../components/GitHubButton";
import Player from "./Player";

function MainComponent(): JSX.Element {
  return (
    <React.Fragment>
      <header>
        <div className="left">
          <h1 className="title">
            <a href="/">
              <img className="logo" alt="RxPlayer" src="./assets/logo_white.png" />
            </a>
            <a
              href="https://developers.canal-plus.com/rx-player/demo_page_by_version.html"
              className="version"
            >
              {" v" + RxPlayer.version}
            </a>
          </h1>
          <nav>
            <a href="https://developers.canal-plus.com/rx-player/doc/Getting_Started/Welcome.html">
              Getting Started
            </a>
            <a href="https://developers.canal-plus.com/rx-player/doc/api/Overview.html">
              API Docs
            </a>
          </nav>
        </div>
        <div className="right">
          <a aria-label="Go to Canal+ website" href="https://canalplus.com">
            <img className="canal-logo" alt="CANAL+" src="./assets/canalp.svg" />
          </a>
          <GitHubButton
            href="https://github.com/canalplus/rx-player"
            ariaLabel="Explore RxPlayer repository"
            dataIcon="octicon-mark-github"
            dataText=""
          />
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
      </header>
      <Player />
    </React.Fragment>
  );
}

export default MainComponent;
