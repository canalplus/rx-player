import manifest1 from "./dash_content_envivio.mpd?raw";
import manifest2 from "./dash_content_tos.mpd?raw";
import manifest3 from "./smooth_content.ism?raw";
import manifest4 from "./dash_live.mpd?raw";

const manifestBlob1 = new Blob([manifest1], { type: "application/xml" });
const manifestURL1 = URL.createObjectURL(manifestBlob1);

const manifestBlob2 = new Blob([manifest2], { type: "application/xml" });
const manifestURL2 = URL.createObjectURL(manifestBlob2);

const manifestBlob3 = new Blob([manifest3], { type: "application/xml" });
const manifestURL3 = URL.createObjectURL(manifestBlob3);

const manifestBlob4 = new Blob([manifest4], { type: "application/xml" });
const manifestURL4 = URL.createObjectURL(manifestBlob4);

export { manifestURL1, manifestURL2, manifestURL3, manifestURL4 };
