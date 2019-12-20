import React from "react";

/**
 * @param {Object} props
 * @returns {Object}
 */
export default function GeneratedLinkURL({
  url,
}) {

  if (url === undefined || url === null || url === "") {
    return (
      <span>
        {"URL: "}
        <a className="generated-url-link none">
          Not a valid content!
        </a>
      </span>);
  }
  return (
    <span>
      {"URL: "}
      <a className="generated-url-link" href={url}>
        {url}
      </a>
    </span>);
}
