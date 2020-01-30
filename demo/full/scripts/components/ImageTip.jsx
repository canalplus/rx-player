import React, {
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * React Component which Displays an Image tip centered and on top of the
 * position wanted.
 *
 * Takes 3 props:
 *   - {Blob|string} Image - The image blob to display
 *   - {string} [className=""] - An optional className for the image
 *   - {Number} xPosition - The position on the horizontal axis where you
 *     want the image to be centered to.
 *
 * @class ImageTip
 */
function ImageTip({
  image,
  xPosition,
  className,
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
      className="image-tip-wrapper"
      ref={wrapperEl}
    >
      <img
        className={"image-tip " + className}
        src={imageUrl}
      />
    </div>
  );
}

export default React.memo(ImageTip);
