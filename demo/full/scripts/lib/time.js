const toSeconds = (timeInSeconds) => {
  const toInt = parseInt(timeInSeconds);
  if (!toInt) { // TODO differentiate NaN from 0?
    return "00";
  }

  return String(toInt).padStart(2, "0");
};

const toMinutes = (timeInSeconds) => {
  const toInt = parseInt(timeInSeconds);
  if (!toInt) { // TODO differentiate NaN from 0?
    return "00:00";
  }

  if (toInt < 60) {
    const str = String(toInt);
    return "00:" + str.padStart(2, "0");
  }

  const numberOfMinutes = parseInt(toInt / 60);
  const numberOfSecondsRemaining = toInt % 60;
  return String(numberOfMinutes).padStart(2, "0") +
    ":" + String(numberOfSecondsRemaining).padStart(2, "0");
};

const toHours = (timeInSeconds) => {
  const toInt = parseInt(timeInSeconds);
  if (!toInt) { // TODO differentiate NaN from 0?
    return "00:00";
  }

  if (toInt < 60) {
    const str = String(toInt);
    return "00:" + str.padStart(2, "0");
  }

  const numberOfMinutes = parseInt(toInt / 60);
  const numberOfSecondsRemaining = toInt % 60;
  if (numberOfMinutes < 60) {
    return (String(numberOfMinutes)).padStart(2, "0") +
      ":" + (String(numberOfSecondsRemaining)).padStart(2, "0");
  }

  const numberOfHours = parseInt(numberOfMinutes / 60);
  const numberOfMinutesRemaining = numberOfMinutes % 60;
  return (String(numberOfHours)).padStart(2, "0") +
    ":" + (String(numberOfMinutesRemaining)).padStart(2, "0") +
    ":" + (String(numberOfSecondsRemaining)).padStart(2, "0");
};

export {
  toSeconds,
  toMinutes,
  toHours,
};
