import React from "react";
import Button from "../components/Button.jsx";
import withModulesState from "../lib/withModulesState.jsx";

function NextProgramButton({
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
        value={String.fromCharCode(0xf138)}
      />
    );
  }
  const indexOf = manifest.periods.indexOf(currentPeriod);
  if (indexOf < 0 || indexOf >= manifest.periods.length) {
    return (
      <Button
        className={"settings-button " + className}
        disabled={true}
        value={String.fromCharCode(0xf138)}
      />
    );
  }
  const newPeriod = manifest.periods[indexOf + 1];
  const onClick = function onNextProgramClick() {
    player.dispatch("SEEK", newPeriod.start);
  };
  return (
    <Button
      onClick={onClick}
      className={"settings-button " + className}
      disabled={false}
      value={String.fromCharCode(0xf138)}
    />
  );
}

export default withModulesState({
  player: {
    currentPeriod: "currentPeriod",
    manifest: "manifest",
  },
})(NextProgramButton);
