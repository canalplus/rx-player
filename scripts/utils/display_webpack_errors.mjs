/**
 * Format errors returned by webpack and display it through a `console.log`
 * call.
 * @param {Array.<Object>} errors
 * @param {Array.<Object>} warnings
 */
export default function displayWebpackErrors(errors, warnings) {
  for (let i = 0; i < warnings.length; i++) {
    const warning = warnings[i];
    if (warning.loaderSource != null) {
      console.error(`\nWarning from ${warning.loaderSource}:`);
    } else {
      console.error("\nWarning:");
    }
    console.error(warning.message);
  }
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    if (error.loaderSource != null) {
      console.error(`\nError from ${error.loaderSource}:`);
    } else {
      console.error("\nError:");
    }
    console.error(error.message);
  }
  if (errors.length || warnings.length) {
    console.log();
  }
}
