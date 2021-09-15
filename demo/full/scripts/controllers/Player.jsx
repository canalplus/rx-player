import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { createModule } from "../lib/vespertine.js";
import PlayerModule from "../modules/player";
import ControlBar from "./ControlBar.jsx";
import ContentList from "./ContentList.jsx";
import Settings from "./Settings.jsx";
import ErrorDisplayer from "./ErrorDisplayer.jsx";
import LogDisplayer from "./LogDisplayer.jsx";
import ChartsManager from "./charts/index.jsx";
import PlayerKnobsSettings from "./PlayerKnobsSettings.jsx";
import isEqual from "../lib/isEqual"

// time in ms while seeking/loading/buffering after which the spinner is shown
const SPINNER_TIMEOUT = 300;

function Player() {
  const [player, setPlayer] = useState(null);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [displaySpinner, setDisplaySpinner] = useState(false);
  const [displaySettings, setDisplaySettings] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [enableVideoThumbnails, setEnableVideoThumbnails] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const initOptsRef = useRef(null);
  const $destroySubjectRef = useRef(null);
  const displaySpinnerTimeoutRef = useRef(0);

  const videoElementRef = useRef(null);
  const textTrackElement = useRef(null);
  const playerWrapperElement = useRef(null);
  const optionsComp = useRef(null);

  const onOptionToggle = () =>
    setShowOptions((prevState) => !prevState);

  const createNewPlayerModule = (videoContent) => {
    const { initOpts } = optionsComp.current.getOptions();
    const playerMod = createModule(PlayerModule, {
      videoElement: videoElementRef.current,
      textTrackElement: textTrackElement.current,
      ...initOpts
    });
    initOptsRef.current = initOpts;

    $destroySubjectRef.current = new Subject();
    $destroySubjectRef.current.subscribe(() => playerMod.destroy());

    // update isStopped and displaySpinner
    playerMod.$get("autoPlayBlocked" ,
                   "isSeeking",
                   "isBuffering",
                   "isLoading",
                   "isReloading",
                   "isStopped",
                   "videoTrackHasTrickMode",
                   "videoElement")
      .pipe(takeUntil($destroySubjectRef.current))
      .subscribe(([
        newAutoPlayBlocked,
        isSeeking,
        isBuffering,
        isLoading,
        isReloading,
        newIsStopped,
        videoTrackHasTrickMode,
      ]) => {
        setAutoPlayBlocked(newAutoPlayBlocked);
        setIsStopped(newIsStopped);
        if (isLoading || isReloading) {
          setDisplaySpinner(true);
        } else if (isSeeking || isBuffering) {
          if (displaySpinnerTimeoutRef.current) {
            clearTimeout(displaySpinnerTimeoutRef.current);
          }
          displaySpinnerTimeoutRef.current = setTimeout(() => {
            setDisplaySpinner(true);
          }, SPINNER_TIMEOUT);
        } else {
          if (displaySpinnerTimeoutRef.current) {
            clearTimeout(displaySpinnerTimeoutRef.current);
            displaySpinnerTimeoutRef.current = 0;
          }
          setDisplaySpinner(false);
        }
        if (enableVideoThumbnails !== videoTrackHasTrickMode) {
          setEnableVideoThumbnails(videoTrackHasTrickMode);
        }
      });
    if (videoContent) {
      loadVideoPlayer(videoContent, playerMod);
    }
    setPlayer(playerMod);
  }

  const cleanCurrentPlayer = () => {
    if ($destroySubjectRef.current) {
      $destroySubjectRef.current.next();
      $destroySubjectRef.current.complete();
    }
    if (displaySpinnerTimeoutRef.current) {
      clearTimeout(displaySpinnerTimeoutRef.current);
    }
    setPlayer(null);
  }

  const loadVideoPlayer = (videoContent, player) => {
    const { loadVideoOpts } = optionsComp.current.getOptions();
    if (videoContent.lowLatencyMode) {
      player.dispatch("ENABLE_LIVE_CATCH_UP");
    } else {
      player.dispatch("DISABLE_LIVE_CATCH_UP");
    }
    player.dispatch("SET_PLAYBACK_RATE", 1);
    player.dispatch("LOAD", { ...videoContent,
                              ...loadVideoOpts });
  };

  useEffect(() => {
    createNewPlayerModule();
    return () => {
      cleanCurrentPlayer();
    }
  }, []);

  const onVideoClick = useCallback(() => {
    const { isPaused, isContentLoaded } = player.get();

    if (!isContentLoaded) {
      return;
    }

    if (isPaused) {
      player.dispatch("PLAY");
    } else {
      player.dispatch("DISABLE_LIVE_CATCH_UP");
      player.dispatch("PAUSE");
    }
  }, [player]);

  const loadVideo = useCallback((video) => {
    const { initOpts: newInitOpts, loadVideoOpts } = optionsComp.current.getOptions();
    if (!isEqual(initOptsRef.current, newInitOpts)) {
      initOptsRef.current = newInitOpts;
      cleanCurrentPlayer();
      createNewPlayerModule(video);
    } else {
      if (video.lowLatencyMode) {
        player.dispatch("ENABLE_LIVE_CATCH_UP");
      } else {
        player.dispatch("DISABLE_LIVE_CATCH_UP");
      }
      player.dispatch("SET_PLAYBACK_RATE", 1);
      player.dispatch("LOAD", { ...video,
                                ...loadVideoOpts });
    }
  }, [player]);


  const stopVideo = useCallback(() => player.dispatch("STOP"), [player]);

  const closeSettings = useCallback(() => {
    setDisplaySettings(false);
  }, []);

  const toggleSettings = useCallback(() => {
    setDisplaySettings(!displaySettings);
  }, [displaySettings]);

  return (
    <section className="video-player-section">
      <div className="video-player-content">
        <ContentList
          loadVideo={loadVideo}
          isStopped={isStopped}
          showOptions={showOptions}
          onOptionToggle={onOptionToggle}
        />
        <Settings showOptions={showOptions} ref={optionsComp} />
        <div
          className="video-player-wrapper"
          ref={playerWrapperElement}
        >
          <div className="video-screen-parent">
            <div
              className="video-screen"
              onClick={() => onVideoClick()}
            >
              { player ? <ErrorDisplayer player={player} /> : null }
              {
                autoPlayBlocked ?
                  <div className="video-player-manual-play-container" >
                    <img
                      className="video-player-manual-play"
                      alt="Play"
                      src="./assets/play.svg"/>
                  </div> :
                  null
              }
              {
                !autoPlayBlocked && displaySpinner ?
                  <img
                    src="./assets/spinner.gif"
                    className="video-player-spinner"
                  /> :
                  null
              }
              <div
                className="text-track"
                ref={textTrackElement}
              />
              <video ref={videoElementRef} />

            </div>
            { player ? 
                <PlayerKnobsSettings
                  close={closeSettings}
                  shouldDisplay={displaySettings}
                  player={player}
                /> :
                null
            }
          </div>
          {
            player ?
              <ControlBar
                player={player}
                videoElement={playerWrapperElement.current}
                toggleSettings={toggleSettings}
                stopVideo={stopVideo}
                enableVideoThumbnails={enableVideoThumbnails}
              /> : null
          }
        </div>
        <ChartsManager player={player} />
        {player ?  <LogDisplayer player={player} /> : null}
      </div>
    </section>
  );
}

export default Player;
