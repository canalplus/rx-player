import * as React from "react";

/**
 * For now, only written "Live" (we will see for timeshifting and such)
 * @param {Object} props
 * @returns {Object}
 */
function LivePosition({ className = "" }: { className?: string }): JSX.Element {
  return <div className={"position-infos live " + className}>Live</div>;
}

export default React.memo(LivePosition);
