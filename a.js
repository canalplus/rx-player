// Cas les plus fréquents

// Seulement mettre la piste courante en français
// ----------------------------------------------
//
// Rien ne change:

const choosenTrack = player.getAvailableAudioTracks()
  .find((t) => t.normalized === "fra" && t.audioDescription !== true);
if (choosenTrack !== undefined) {
  player.setAudioTrack(choosenTrack.id);
}

// Mettre la piste francaise pour toutes les Periods
// -------------------------------------------------
//
// Brancher l'event `"newAvailablePeriods"` pour les futures Periods anoncées
// après mise à jour du Manifest et au changement de contenu et appeller
// `setAudioTrack` pour toutes les Periods:

player.addEventListener("newAvailablePeriods", (periods) => {
  periods.forEach(setFrenchTrackForPeriod);
});
player.getAvailablePeriods()
  .forEach(setFrenchTrackForPeriod);

function setFrenchTrackForPeriod(periodInfo) {
  const chosenTrack = player.getAvailableAudioTracks(periodInfo.id)
    .find((t) => t.normalized === "fra" && t.audioDescription !== true);
  if (choosenTrack !== undefined) {
    player.setAudioTrack( { periodId: periodInfo.id,
                            trackId: chosenTrack.id });
  }
}

// Plus général: changer la piste pour toutes les Periods
// ------------------------------------------------------
//
// Pareil, juste ajoutons un store simplifié:

const SomeStore = {
  language: "eng",
  isAudioDescription: false,
};

player.addEventListener("newAvailablePeriods", (periods) => {
  periods.forEach(setAudioTrackForPeriod);
});

function updateAllAudioTracks(newLanguage, newAudioDescriptionStatus) {
  SomeStore.language = newLanguage;
  SomeStore.isAudioDescription = newAudioDescriptionStatus;
  player.getAvailablePeriods().forEach(setAudioTrackForPeriod);
}

function setAudioTrackForPeriod(periodInfo) {
  const { language, isAudioDescription } = SomeStore;
  const choosenTrack = player.getAvailableAudioTracks(periodInfo.id)
    .find((t) =>
      t.normalized === language &&
      isAudioDescription ? t.audioDescription === true :
                           t.audioDescription !== true);
  if (choosenTrack !== undefined) {
    player.setAudioTrack({
      trackId: choosenTrack.id,
      lockedRepresentations: [chosenTrack.representations[0].id]
    }, periodInfo.id);
  }
}


// Simplifier et optimiser ce cas fréquent pour le futur ?
// -------------------------------------------------------
//
// Proposition d'un "defaultAudioTrackSelector" configurable pour définir la piste par
// défaut:

const SomeStore = {
  language: "eng",
  isAudioDescription: false,
};

function updateAllAudioTracks(newLanguage, newAudioDescriptionStatus) {
  SomeStore.language = newLanguage;
  SomeStore.isAudioDescription = newAudioDescriptionStatus;
  player.setDefaultAudioTrackSelector(setAudioTrackForPeriod);
}

function setAudioTrackForPeriod(audioTracks, _periodInfo) {
  const { language, isAudioDescription } = SomeStore;
  const choosenTrack = audioTracks.find((t) =>
      t.normalized === language &&
      isAudioDescription ? t.audioDescription === true :
                           t.audioDescription !== true);
  if (choosenTrack === undefined) {
    // preference not found, let the RxPlayer choose for us
    return undefined;
  }
  // preference found: select it
  return choosenTrack.id;
}

// => reset pour la Period courante ? second argument booléen
// => persisté au changement de contenu ? oui
// => autoriser un setAudioTrack pendant qu'un defaultAudioTrackSelector est actif ? oui

player.hasDefaultAudioTrackSelector();
player.removeDefaultAudioTrackSelector();


// All APIs:

player.getAvailableAudioTracks();
player.getAvailableVideoTracks();
player.getAvailableTextTracks();
player.getAudioTrack();
player.getVideoTrack();
player.getTextTrack();
player.setAudioTrack();
player.setVideoTrack();
player.setTextTrack();

player.setDefaultAudioTrackSelector();
player.setDefaultVideoTrackSelector();
player.setDefaultTextTrackSelector();
player.removeDefaultAudioTrackSelector();
player.removeDefaultVideoTrackSelector();
player.removeDefaultTextTrackSelector();
player.hasDefaultAudioTrackSelector();
player.hasDefaultVideoTrackSelector();
player.hasDefaultTextTrackSelector();


// ```
// # Representation (quality) selection
//
// ## lockVideoRepresentations / lockAudioRepresentations


player.setMaxVideoBitrate(1000);

// For all future Periods and contents
player.addEventListener("newAvailablePeriods", (periods) => {
  periods.forEach((p) => limitVideoBitrate(p, 1000));
});

// If currently playing, for all Periods in the current content
player.getAvailablePeriods()
  .forEach((p) => limitVideoBitrate(p, 1000));

// At each track change
player.setAudioTrack({
  trackId,
  periodId,
  lockedRepresentations: getLimited(p, 1000),
});


// Automatically filter which Representation will be played by default
player.setAutoVideoRepresentationsLocker((videoTrack, _periodInfo) => {
  const filtered = videoTrack.representations
    .filter(rep => rep.bitrate !== undefined && rep.bitrate <= 1000)
    .map(rep => rep.id);

  if (filtered.length === 0) {
    if (videoTrack.representations.length === 0) {
      return;
    }
    const minBitrate = videoTrack.representations.sort((a, b) => {

    });
  }
}, true);

player.setDefaultVideoTrackSelector((videoTracks, _periodInfo) => {
  const activeVideoTrack = videoTracks.find(v => v.active) ?? videoTracks[0];
  const filtered = activeVideoTrack.representations
    .filter(rep => rep.bitrate !== undefined && rep.bitrate <= 1000)
    .map(rep => rep.id);

  if (filtered.length === 0) {
    if (activeVideoTrack.representations.length === 0) {
      return;
    }
    const minBitrate = activeVideoTrack.representations.sort((a, b) => {

    });
  }
}, true);

// Powerful enough to remove the need of track preference APIs, bitrate APIs and the
// representationFilter API which all have their issues (mostly, they are not flexible enough and had
// some complex behavior when diving into the details).
//
// However simple use cases that were previously easy to configure through those APIs are much harder
// with thhe new.


// representationFilter
//
// If this function was used to filter out some audio and/or video
// Representation (which is all cases we've seen), its behavior can be
// reproduced by using the new Representations "locking" feature, which allows
// to only allow some Representations from being played (see
// `lockVideoRepresentations` / `lockAudioRepresentations`).
//
// The new Representations locking feature is also more powerful, allowing to
// inspect all other Representations from the corresponding track - or even all
// other tracks while the filter function is called.
//
// The easiest way of replacing `representationFilter` could be by locking
// wanted Representations through a "default video/audio track selector" before
// calling `loadVideo`.
// This can be donethrough the `setDefaultVideoTrackSelector` and/or the
// `setDefaultAudioTrackSelector` method, depending on if you want to limit the
// video Representations or the audio Representations. The following examples
// are going to show how this can be done for video tracks, but it can also be
// applied on audio tracks with the corresponding alternative methods.

// Only authorize some video Representations from being played on the default
// video tracks chosen by the RxPlayer:
player.setDefaultVideoTrackSelector((videoTracks, periodInfo) => {
  // Note: The `videoTracks` array begins by the default video track
  const filtered = videoTracks[0].representations.filter(representationFilter);
  return {
    periodId: periodInfo.id,
    lockedRepresentations: filtered,
    trackId: videoTracks[0].id,
  };
});

// Note that this filter is persisted even through the next contents you will
// play. If you want to remove it, you can call the
// `removeDefaultVideoTrackSelector` method:
player.removeDefaultVideoTrackSelector();

// If switching the video track is possible in your application, don't forget to
// also apply the filter there:
function changeVideoTrack(periodId, videoTrack) {
  const filtered = videoTrack.representations.filter(representationFilter);
  player.setVideoTrack({
    periodId,
    lockedRepresentations: filtered,
    trackId: videoTrack.id,
  });
}

// And that's all! You should now always be filtering out video Representations
// for all video tracks chosen.

// Note that if you display Representations choice to the user in some ways, you
// might also want to remove the choice from that list:
function getAvailableVideoRepresentations() {
  player.getVideoTrack()
  if (videoTrack === null) {
    return []; //"No video track currently");
  }
  return videoTrack.representations.filter(representationFilter);
}

// update the documentation:
//   - setAudioTrack
//   - setTextTrack
//   - setVideoTrack
//
// Add the documentation:
//   - getAvailablePeriods method
//
// Write tests
//
// representationChange event?

// /!\ ChromeCast etc.
// singleLicensePer: "periods"

// test Samsung


// Example: Know when the video Representations lock is enabled / disabled for
// the Period currently being played

let areVideoRepresentationsLocked = false;

function updateAreVideoRepresentationsLocked() {
 areVideoRepresentationsLocked =
   rxPlayer.getLockedVideoRepresentations() !== null;
}

// Update it each time the video lock for the current Period is "broken"
rxPlayer.addEventListener("brokenRepresentationsLock", (info) => {
  const currentPeriod = rxPlayer.getCurrentPeriod();
  if (
    info.trackType === "video" &&
    currentPeriod !== null && info.period.id === currentPeriod.id
  ) {
    updateAreVideoRepresentationsLocked();
  }
});

// Update it each time the video track for the current Period changes, whether
// it was done explicitely (through setVideoTrack/disableVideoTrack),
// implicitely (the RxPlayer automatically switched by itself) or just because
// a new Period is now being played.
rxPlayer.addEventListener("videoTrackChange", () => {
  updateAreVideoRepresentationsLocked();
});

// And update it each time the lock API are called for the current Period
function lockVideoRepresentations(reps) {
 rxPlayer.lockVideoRepresentations(reps);
 updateAreVideoRepresentationsLocked();
}
function unlockVideoRepresentations() {
 rxPlayer.unlockVideoRepresentations();
 updateAreVideoRepresentationsLocked();
}


// Example: Know when the video Representations lock is enabled / disabled for
// any Period

// First let's consider a given period `id` named `PERIOD_ID`
const PERIOD_ID = "<SOME_PERIOD_ID>";

let areVideoRepresentationsLockedForPeriod = false;

function updateAreVideoRepresentationsLocked() {
 areVideoRepresentationsLockedForPeriod =
   rxPlayer.getLockedVideoRepresentations(PERIOD_ID) !== null;
}

// Update it each time the video lock for the corresponding Period is "broken"
rxPlayer.addEventListener("brokenRepresentationsLock", (info) => {
  if (info.trackType === "video" && info.period.id === PERIOD_ID) {
    updateAreVideoRepresentationsLocked();
  }
});

// Update it each time the video track is voluntarly changed/disabled for that Period
function setVideoTrackForPeriod(periodId, trackId) {
  rxPlayer.setVideoTrack({ periodId, trackId });
  if (periodId === PERIOD_ID) {
    updateAreVideoRepresentationsLocked();
  }
}
function disableVideoTrackForPeriod() {
  rxPlayer.setVideoTrack({ periodId, trackId });
  if (periodId === PERIOD_ID) {
    updateAreVideoRepresentationsLocked();
  }
}

// Update it each time, the RxPlayer decides to automatically change the video
// track for that Period (extremely rare)
rxPlayer.addEventListener("autoTrackSwitch", (info) => {
  if (info.trackType === "video" && info.period.id === PERIOD_ID) {
    updateAreVideoRepresentationsLocked();
  }
});

// And update it each time the lock API are called for that Period
function lockVideoRepresentations(periodId, representations) {
 rxPlayer.lockVideoRepresentations({ periodId, representations });
 if (periodId === PERIOD_ID) {
  updateAreVideoRepresentationsLocked();
 }
}
function unlockVideoRepresentations(periodId) {
 rxPlayer.unlockVideoRepresentations(periodId);
 if (periodId === PERIOD_ID) {
  updateAreVideoRepresentationsLocked();
 }
}
