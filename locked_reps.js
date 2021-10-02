function chooseQualityBasedOnHeight(height) {
  const videoReps = player.getAvailableVideoRepresentations(period.id);

  const filtered = videoReps
    .filter(v => v.height === height);

  if (filtered.length > 0) {
    player.lockVideoRepresentations(filtered);
  }
}

function switchVideoToAuto() {
  player.unlockVideoRepresentations();
}

player.areVideoRepresentationsLocked();


// -> persisté entre Period => oui
// -> persisté au changement de piste ?
//   Si oui, necessité de connaitre d'avance les locked pour une autre piste
//
// -> que faire si Array vide ? On plante
// -> que faire si fallback ? => débloque et on envoie un event


player.setVideoBitrate();
player.getVideoBitrate();

player.lockVideoRepresentations({
  representations: filtered,
  periodId,
  switchBehavior: "reload" | "smooth" | "direct",
});

player.lockVideoRepresentations({
  representations: filtered,
  periodId,
  switchBehavior: "reload" | "smooth" | "direct",
});

player.setVideoTrack({
  periodId,
  trackId,
  switchBehavior: "reload" | "smooth" | "direct",
});
