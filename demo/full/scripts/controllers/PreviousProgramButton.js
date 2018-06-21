import React from "react";
import Button from "../components/Button.jsx";
import withModulesState from "../lib/withModulesState.jsx";

function PreviousProgramButton({
  className = "",
  currentPeriod,
  manifest,
  player,
}) {
  if (!manifest) {
    return (
      <Button
        className={"settings-button " + className}
        disabled={true}
        value={String.fromCharCode(0xf137)}
      />
    );
  }
  const indexOf = manifest.periods.indexOf(currentPeriod);
  if (indexOf < 0) {
    return (
      <Button
        className={"settings-button " + className}
        disabled={true}
        value={String.fromCharCode(0xf137)}
      />
    );
  }
  const newPeriod = indexOf === 0 ?
    currentPeriod : manifest.periods[indexOf - 1];
  const onClick = function onPreviousProgramClick() {
    player.dispatch("SEEK", newPeriod.start);
  };
  return (
    <Button
      onClick={onClick}
      className={"settings-button " + className}
      disabled={false}
      value={String.fromCharCode(0xf137)}
    />
  );
}

export default withModulesState({
  player: {
    currentPeriod: "currentPeriod",
    manifest: "manifest",
  },
})(PreviousProgramButton);
