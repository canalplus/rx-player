import React from "react";
import withModulesState from "../lib/withModulesState.jsx";

const PlayerError = ({ error }) => {
  const message = error && error.message ? error.message : error;

  return (
    <span className="fatal-error">
      <span className="error-icon icon">
        {String.fromCharCode(0xf071)}
      </span>
      <span className="error-intro">
        The Player encountered a fatal Error:
      </span>
      <span className="error-message">
        {message}
      </span>
    </span>
  );
};

const ErrorDisplayer = ({ error }) => {
  return (
    <div className="player-error">
      {
        error ?
          <PlayerError error={error} /> : null
      }
    </div>
  );
};

export default React.memo(withModulesState({
  player: {
    error: "error",
  },
})(ErrorDisplayer));
