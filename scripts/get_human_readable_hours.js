/* eslint-env node */

module.exports = function getHumanReadableHours() {
  const date = new Date();
  return String(date.getHours()).padStart(2, "0") + ":" +
    String(date.getMinutes()).padStart(2, "0") + ":" +
    String(date.getSeconds()).padStart(2, "0") + ":" +
    String(date.getSeconds()).padStart(2, "0") + "." +
    String(date.getMilliseconds()).padStart(4, "0");
};
