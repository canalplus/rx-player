import React from "react";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { createModule } from "../lib/vespertine.js";
import PlayerModule from "../modules/player";
import ControlBar from "./ControlBar.jsx";
import ContentList from "./ContentList.jsx";
import ErrorDisplayer from "./ErrorDisplayer.jsx";
import LogDisplayer from "./LogDisplayer.jsx";
import ChartsManager from "./charts/index.jsx";
import PlayerKnobsManager from "./PlayerKnobs.jsx";

// time in ms while seeking/loading/buffering after which the spinner is shown
const SPINNER_TIMEOUT = 300;

class Player extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      player: null,
      displaySpinner: false,
      displaySettings: false,
      isPlaying: false,
    };
  }

  componentDidMount() {
    const player = createModule(PlayerModule, {
      videoElement: this.videoElement,
      textTrackElement: this.textTrackElement,
    });

    this._$destroySubject = new Subject();
    this._$destroySubject.subscribe(() => player.destroy());

    player.$get("isSeeking", "isBuffering", "isLoading", "isReloading", "isPlaying")
      .pipe(takeUntil(this._$destroySubject))
      .subscribe(([
        isSeeking,
        isBuffering,
        isLoading,
        isReloading,
        isPlaying,
      ]) => {
        this.setState({ isPlaying });
        if (isLoading || isReloading) {
          this.setState({ displaySpinner: true });
        } else if (isSeeking || isBuffering) {
          this._displaySpinnerTimeout = setTimeout(() => {
            this.setState({ displaySpinner: true });
          }, SPINNER_TIMEOUT);
        } else {
          if (this._displaySpinnerTimeout) {
            clearTimeout(this._displaySpinnerTimeout);
            this._displaySpinnerTimeout = 0;
          }

          if (this.state.displaySpinner) {
            this.setState({
              displaySpinner: false,
            });
          }
        }

      });

    this.setState({ player });
    // for DEV mode
    window.playerModule = player;
  }

  // will never happen, but still
  componentWillUnmount() {
    if (this._$destroySubject) {
      this._$destroySubject.next();
      this._$destroySubject.complete();
    }
    if (this._displaySpinnerTimeout) {
      clearTimeout(this._displaySpinnerTimeout);
    }
  }

  onVideoClick() {
    const { isPaused, isContentLoaded } =
      this.state.player.get();

    if (!isContentLoaded) {
      return;
    }

    this.state.player.dispatch(isPaused ? "PLAY"  : "PAUSE");
  }

  render() {
    const { player, displaySpinner, isPlaying } = this.state;
    const loadVideo = (video) => this.state.player.dispatch("LOAD", video);
    const stopVideo = () => this.state.player.dispatch("STOP");

    const changeDisplay = () => {
      this.setState({ displaySettings: !this.state.displaySettings });
    };

    return (
      <section className="video-player-section">
        <div className="video-player-content">
          <ContentList
            loadVideo={loadVideo}
            stopVideo={stopVideo}
            isPlaying={isPlaying}
          />
          <div
            className="video-player-wrapper"
            ref={element => this.playerWrapperElement = element }
          >
            <div
              className="video-wrapper"
              onClick={() => this.onVideoClick()}
            >
              <ErrorDisplayer player={player} />
              { displaySpinner ?
                <img
                  src="./assets/spinner.gif"r
                  className="video-player-spinner"
                /> : null
              }
              <div
                className="text-track"
                ref={element => this.textTrackElement = element }
              />
              <video
                ref={element => this.videoElement = element }
              />
              <PlayerKnobsManager
                display={this.state.displaySettings}
                player={player}
              />
            </div>
            {
              player ?
                <ControlBar
                  player={player}
                  videoElement={this.playerWrapperElement}
                  isContentLoaded={this.state.player.get().isContentLoaded}
                  isLive={this.state.player.get().isLive}
                  currentTime={this.state.player.get().currentTime}
                  duration={this.state.player.get().duration}
                  changeDisplay={changeDisplay}
                /> : null}
          </div>
          {player ?  <ChartsManager player={player} /> : null }
          {player ?  <LogDisplayer player={player} /> : null}
        </div>
      </section>
    );
  }
}

export default Player;
