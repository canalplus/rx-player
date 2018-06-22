import React from "react";
import Button from "../components/Button.jsx";
import withModulesState from "../lib/withModulesState.jsx";

function LiveProgramButton({
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
        value={String.fromCharCode(0xf0e2)}
      />
    );
  }
  const indexOf = manifest.periods.indexOf(currentPeriod);
  if (indexOf < 0 || indexOf >= manifest.periods.length) {
    return (
      <Button
        className={"settings-button " + className}
        disabled={true}
        value={String.fromCharCode(0xf0e2)}
      />
    );
  }
  const onClick = function onLiveProgramClick() {
    player.dispatch("SEEK", Date.now() / 1000);
  };
  return (
    <Button
      onClick={onClick}
      className={"settings-button " + className}
      disabled={false}
      value={String.fromCharCode(0xf0e2)}
    />
  );
}

export default withModulesState({
  player: {
    currentPeriod: "currentPeriod",
    manifest: "manifest",
  },
})(LiveProgramButton);
