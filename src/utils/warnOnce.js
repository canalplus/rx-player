import arrayIncludes from "./array-includes.js";

const WARNED_MESSAGES = [];

/**
 * Perform a console.warn only once in the application lifetime.
 *
 * Useful for deprecated messages, for example.
 *
 * @param {string} message
 */
const warnOnce = (message) => {
  if (!arrayIncludes(WARNED_MESSAGES, message)) {
    console.warn(message);
    WARNED_MESSAGES.push(message);
  }
};

export default warnOnce;
