import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createModule } from "../lib/vespertine.js";
import PlayerModule from "../modules/player";
import ControlBar from "./ControlBar.jsx";
import ContentList from "./ContentList.jsx";
import Settings from "./Settings.jsx";
import ErrorDisplayer from "./ErrorDisplayer.jsx";
import ChartsManager from "./charts/index.jsx";
import PlayerKnobsSettings from "./PlayerKnobsSettings.jsx";
import defaultOptionsValues from "../lib/defaultOptionsValues.js";

// time in ms while seeking/loading/buffering after which the spinner is shown
const SPINNER_TIMEOUT = 300;

function Player() {
  const [playerModule, setPlayerModule] = useState(null);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [displaySpinner, setDisplaySpinner] = useState(false);
  const [displaySettings, setDisplaySettings] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [enableVideoThumbnails, setEnableVideoThumbnails] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [playerOpts, setPlayerOpts] = useState(defaultOptionsValues.player);
  const [loadVideoOpts, setLoadVideoOpts] = useState(
    defaultOptionsValues.loadVideo
  );
  const [hasUpdatedPlayerOptions, setHasUpdatedPlayerOptions] = useState(false);
  const displaySpinnerTimeoutRef = useRef(null);

  const videoElementRef = useRef(null);
  const textTrackElementRef = useRef(null);
  const playerWrapperElementRef = useRef(null);

  const onOptionToggle = useCallback(() => {
    setShowOptions((prevState) => !prevState);
  }, []);

  const clearSpinner = useCallback(() => {
    if (displaySpinnerTimeoutRef.current) {
      clearTimeout(displaySpinnerTimeoutRef.current);
      displaySpinnerTimeoutRef.current = null;
    }
  }, []);

  // Bind events on player module creation and destroy old when it changes
  useEffect(() => {
    if (playerModule === null) {
      return;
    }
    function reCheckSpinner() {
      const isSeeking = playerModule.get("isSeeking");
      const isBuffering = playerModule.get("isBuffering");
      const isLoading = playerModule.get("isLoading");
      const isReloading = playerModule.get("isReloading");
      if (isLoading || isReloading) {
        // When loading/reloading: show spinner immediately
        if (displaySpinnerTimeoutRef.current !== null) {
          clearTimeout(displaySpinnerTimeoutRef.current);
          displaySpinnerTimeoutRef.current = null;
        }
        setDisplaySpinner(true);
      } else if (isSeeking || isBuffering) {
        // When seeking/rebuffering: show spinner after a delay
        if (displaySpinnerTimeoutRef.current === null) {
          displaySpinnerTimeoutRef.current = setTimeout(() => {
            setDisplaySpinner(true);
          }, SPINNER_TIMEOUT);
        }
      } else {
        if (displaySpinnerTimeoutRef.current !== null) {
          clearTimeout(displaySpinnerTimeoutRef.current);
          displaySpinnerTimeoutRef.current = null;
        }
        setDisplaySpinner(false);
      }
    }

    playerModule.addStateListener("autoPlayBlocked", (newAutoPlayBlocked) => {
      setAutoPlayBlocked(newAutoPlayBlocked);
    });
    playerModule.addStateListener("isStopped", (newIsStopped) => {
      setIsStopped(newIsStopped);
    });
    playerModule.addStateListener("videoTrackHasTrickMode", (videoTrackHasTrickMode) => {
      setEnableVideoThumbnails(videoTrackHasTrickMode);
    });

    playerModule.addStateListener("isSeeking", reCheckSpinner);
    playerModule.addStateListener("isBuffering", reCheckSpinner);
    playerModule.addStateListener("isLoading", reCheckSpinner);
    playerModule.addStateListener("isReloading", reCheckSpinner);
    reCheckSpinner();
    return () => {
      playerModule.destroy();
      clearSpinner();
    };
  }, [playerModule]);

  const createNewPlayerModule = useCallback(() => {
    const playerMod = createModule(
      PlayerModule,
      Object.assign(
        {},
        {
          videoElement: videoElementRef.current,
          textTrackElement: textTrackElementRef.current,
        },
        playerOpts
      )
    );
    setPlayerModule(playerMod);
    return playerMod;
  }, [playerOpts]);

  const onVideoClick = useCallback(() => {
    const { isPaused, isContentLoaded } = playerModule.get();

    if (!isContentLoaded) {
      return;
    }

    if (isPaused) {
      playerModule.dispatch("PLAY");
    } else {
      playerModule.dispatch("DISABLE_LIVE_CATCH_UP");
      playerModule.dispatch("PAUSE");
    }
  }, [playerModule]);

  const startContent = useCallback((contentInfo) => {
    let playerMod = playerModule;
    if (playerMod === null || hasUpdatedPlayerOptions) {
      setHasUpdatedPlayerOptions(false);
      playerMod = createNewPlayerModule();
    }
    loadContent(playerMod, contentInfo, loadVideoOpts);
  }, [
    playerModule,
    hasUpdatedPlayerOptions,
    createNewPlayerModule,
    loadVideoOpts,
  ]);

  const stopVideo = useCallback(() => playerModule.dispatch("STOP"), [playerModule]);

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
          loadVideo={startContent}
          isStopped={isStopped}
          showOptions={showOptions}
          onOptionToggle={onOptionToggle}
        />
        <Settings
          playerOptions={playerOpts}
          updatePlayerOptions={updatePlayerOptions}
          loadVideoOptions={loadVideoOpts}
          updateLoadVideoOptions={setLoadVideoOpts}
          showOptions={showOptions}
        />
        <div
          className="video-player-wrapper"
          ref={playerWrapperElementRef}
        >
          <div className="video-screen-parent">
            <div
              className="video-screen"
              onClick={() => onVideoClick()}
            >
              { playerModule ? <ErrorDisplayer player={playerModule} /> : null }
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
                ref={textTrackElementRef}
              />
              <video ref={videoElementRef} />

            </div>
            {
              playerModule ?
                <PlayerKnobsSettings
                  close={closeSettings}
                  shouldDisplay={displaySettings}
                  player={playerModule}
                /> :
                null
            }
          </div>
          {
            playerModule ?
              <ControlBar
                player={playerModule}
                videoElement={playerWrapperElementRef.current}
                toggleSettings={toggleSettings}
                stopVideo={stopVideo}
                enableVideoThumbnails={enableVideoThumbnails}
              /> : null
          }
        </div>
        <ChartsManager player={playerModule} />
      </div>
    </section>
  );

  function updatePlayerOptions(fn) {
    setHasUpdatedPlayerOptions(true);
    setPlayerOpts(fn);
  }
}

function loadContent(playerModule, contentInfo, loadVideoOpts) {
  if (contentInfo.lowLatencyMode) {
    playerModule.dispatch("ENABLE_LIVE_CATCH_UP");
  } else {
    playerModule.dispatch("DISABLE_LIVE_CATCH_UP");
  }
  playerModule.dispatch("SET_PLAYBACK_RATE", 1);
  playerModule.dispatch("LOAD", Object.assign({}, contentInfo, loadVideoOpts));
}

export default Player;
