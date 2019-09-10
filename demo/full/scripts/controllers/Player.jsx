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
import PlayerKnobsSettings from "./PlayerKnobsSettings.jsx";

// time in ms while seeking/loading/buffering after which the spinner is shown
const SPINNER_TIMEOUT = 300;

class Player extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      player: null,
      displaySpinner: false,
      displaySettings: false,
      isStopped: true,
      isCatchingUp: false,
      isStickingToTheLiveEdge: true,
    };
  }

  componentDidMount() {
    const player = createModule(PlayerModule, {
      videoElement: this.videoElement,
      textTrackElement: this.textTrackElement,
    });

    this._$destroySubject = new Subject();
    this._$destroySubject.subscribe(() => player.destroy());

    player.$get("isSeeking",
                "isBuffering",
                "isLoading",
                "isReloading",
                "isStopped",
                "liveGap",
                "lowLatencyMode"
    )
      .pipe(takeUntil(this._$destroySubject))
      .subscribe(([
        isSeeking,
        isBuffering,
        isLoading,
        isReloading,
        isStopped,
        liveGap,
        lowLatencyMode,
      ]) => {
        const { isCatchingUp,
                isStickingToTheLiveEdge } = this.state;

        if (player) {
          const shouldCatchUp = (liveGap > 7 ||
                                 isCatchingUp && liveGap > 5) &&
                                 isStickingToTheLiveEdge &&
                                 lowLatencyMode;

          if (shouldCatchUp) {
            if (liveGap > 10) {
              const maximumPosition = player.get("maximumPosition");
              player.dispatch("SEEK", maximumPosition - 5);
            } else {
              const factor = (liveGap - 5) / 4;
              const rate = Math.round(
                (liveGap > 5 ? Math.min(10, 1.1 + factor) : 1) * 10
              ) / 10;
              const lastCatchUpRate = player.get("playbackPosition");
              if (rate !== lastCatchUpRate) {
                this.setState({
                  lowLatencyMode,
                  isCatchingUp: true,
                });
                player.dispatch("SET_PLAYBACK_RATE", rate);
              }
            }
          } else if (isCatchingUp) {
            this.setState({ isCatchingUp: false });
            player.dispatch("SET_PLAYBACK_RATE", 1);
          }
        }

        this.setState({ isStopped });
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
    const { player, displaySpinner, isStopped, isStickingToTheLiveEdge, isCatchingUp } =
      this.state;

    const loadVideo = (video) => this.state.player.dispatch("LOAD", video);
    const stopVideo = () => this.state.player.dispatch("STOP");

    const closeSettings = () => {
      this.setState({ displaySettings: false });
    };
    const toggleSettings = () => {
      this.setState({ displaySettings: !this.state.displaySettings });
    };

    const changeStickToLiveEdge = (shouldStick) => {
      this.setState({ isStickingToTheLiveEdge: shouldStick });
    };

    return (
      <section className="video-player-section">
        <div className="video-player-content">
          <ContentList
            loadVideo={loadVideo}
            isStopped={isStopped}
          />
          <div
            className="video-player-wrapper"
            ref={element => this.playerWrapperElement = element }
          >
            <div className="video-screen-parent">
              <div
                className="video-screen"
                onClick={() => this.onVideoClick()}
              >
                <ErrorDisplayer player={player} />
                {
                  displaySpinner ?
                    <img
                      src="./assets/spinner.gif"
                      className="video-player-spinner"
                    /> :
                    null
                }
                <div
                  className="text-track"
                  ref={element => this.textTrackElement = element }
                />
                <video ref={element => this.videoElement = element }/>

              </div>
              <PlayerKnobsSettings
                close={closeSettings}
                shouldDisplay={this.state.displaySettings}
                player={player}
              />
            </div>
            {
              player ?
                <ControlBar
                  player={player}
                  videoElement={this.playerWrapperElement}
                  toggleSettings={toggleSettings}
                  changeStickToLiveEdge={changeStickToLiveEdge}
                  isStickingToTheLiveEdge={isStickingToTheLiveEdge}
                  stopVideo={stopVideo}
                  isCatchingUp={isCatchingUp}
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
