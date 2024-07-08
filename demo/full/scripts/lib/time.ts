const toSeconds = (timeInSeconds: number): string => {
  const toInt = Math.floor(timeInSeconds);
  if (!toInt) {
    return "00";
  }

  return String(toInt).padStart(2, "0");
};

const toMinutes = (timeInSeconds: number): string => {
  const toInt = Math.floor(timeInSeconds);
  if (!toInt) {
    return "00:00";
  }

  if (toInt < 60) {
    const str = String(toInt);
    return "00:" + str.padStart(2, "0");
  }

  const numberOfMinutes = Math.floor(toInt / 60);
  const numberOfSecondsRemaining = toInt % 60;
  return (
    String(numberOfMinutes).padStart(2, "0") +
    ":" +
    String(numberOfSecondsRemaining).padStart(2, "0")
  );
};

const toHours = (timeInSeconds: number): string => {
  const toInt = Math.floor(timeInSeconds);
  if (!toInt) {
    return "00:00";
  }

  if (toInt < 60) {
    const str = String(toInt);
    return "00:" + str.padStart(2, "0");
  }

  const numberOfMinutes = Math.floor(toInt / 60);
  const numberOfSecondsRemaining = toInt % 60;
  if (numberOfMinutes < 60) {
    return (
      String(numberOfMinutes).padStart(2, "0") +
      ":" +
      String(numberOfSecondsRemaining).padStart(2, "0")
    );
  }

  const numberOfHours = Math.floor(numberOfMinutes / 60);
  const numberOfMinutesRemaining = numberOfMinutes % 60;
  return (
    String(numberOfHours).padStart(2, "0") +
    ":" +
    String(numberOfMinutesRemaining).padStart(2, "0") +
    ":" +
    String(numberOfSecondsRemaining).padStart(2, "0")
  );
};

export { toSeconds, toMinutes, toHours };
