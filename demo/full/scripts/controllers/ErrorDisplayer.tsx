import * as React from "react";
import useModuleState from "../lib/useModuleState";
import type { IPlayerModule } from "../modules/player/index";

function PlayerError({ error }: { error: Error }): JSX.Element {
  const message: string =
    typeof error.message === "string" ? error.message : String(error);

  return (
    <span className="fatal-error">
      <span className="error-icon icon">{String.fromCharCode(0xf071)}</span>
      <span className="error-intro">The Player encountered a fatal Error:</span>
      <span className="error-message">{message}</span>
    </span>
  );
}

function ErrorDisplayer({ player }: { player: IPlayerModule }): JSX.Element {
  const error = useModuleState(player, "error");
  return (
    <div className="player-error">{error ? <PlayerError error={error} /> : null}</div>
  );
}

export default React.memo(ErrorDisplayer);
