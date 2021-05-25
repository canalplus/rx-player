import React, {
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * React Component which Displays an Image thumbnail centered and on top of the
 * position wanted.
 *
 * Takes 2 parameters:
 *   - {Blob|string} Image - The image blob to display
 *   - {Number} xPosition - The position on the horizontal axis where you
 *     want the image to be centered to.
 *
 * @function ImageThumbnail
 * @param {Object}
 */
function ImageThumbnail({
  image,
  xPosition,
}) {
  const wrapperEl = useRef(null);
  const [ imageUrl, setImageUrl ] = useState("");
  useEffect(() => {
    const blob = new Blob([image], {type: "image/jpeg"});
    const url = URL.createObjectURL(blob);
    setImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [image]);
  useEffect(() => {
    if (isNaN(+xPosition) || wrapperEl.current === null) {
      return null;
    }
    wrapperEl.current.style.transform = `translate(${xPosition}px, -136px)`;
  }, [xPosition]);
  return (
    <div
      className="thumbnail-wrapper"
      ref={wrapperEl}
    >
      <img
        className={"thumbnail"}
        src={imageUrl}
      />
    </div>
  );
}

export default React.memo(ImageThumbnail);
