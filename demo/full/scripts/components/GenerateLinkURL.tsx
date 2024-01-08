import * as React from "react";
import Button from "./Button";

/**
 * @param {Object} props
 * @returns {Object}
 */
function GeneratedLinkURL({ url }: { url: string | undefined | null }): JSX.Element {
  const [hasBeenCopied, setHasBeenCopied] = React.useState(false);
  const onCopyURLtoClipboard = () => {
    setHasBeenCopied(true);
    setTimeout(() => setHasBeenCopied(false), 3000);
    if (typeof url === "string") {
      navigator.clipboard.writeText(url).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("Demo: Can't copy URL in clipboard.", err);
      });
    }
  };

  if (url === undefined || url === null || url === "") {
    return (
      <span>
        {"URL: "}
        <a className="generated-url-link none">Not a valid content!</a>
      </span>
    );
  }
  return (
    <>
      <span className="generated-url-link-wrapper">
        {"URL: "}
        <a className="generated-url-link" href={url}>
          {url}
        </a>
      </span>
      <Button
        key={0}
        className={"copy-url-button"}
        disabled={hasBeenCopied}
        ariaLabel="Copy URL to clipboard"
        onClick={onCopyURLtoClipboard}
        value={hasBeenCopied ? "Copied!" : "Copy"}
      />
    </>
  );
}

export default React.memo(GeneratedLinkURL);
