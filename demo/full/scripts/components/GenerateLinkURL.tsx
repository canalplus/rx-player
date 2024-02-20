import * as React from "react";

/**
 * @param {Object} props
 * @returns {Object}
 */
function GeneratedLinkURL({ url }: { url: string | undefined | null }): JSX.Element {
  if (url === undefined || url === null || url === "") {
    return (
      <span>
        {"URL: "}
        <a className="generated-url-link none">Not a valid content!</a>
      </span>
    );
  }
  return (
    <span>
      {"URL: "}
      <a className="generated-url-link" href={url}>
        {url}
      </a>
    </span>
  );
}

export default React.memo(GeneratedLinkURL);
