import launchTestsForContent from "../launch_tests_for_content.js";

import {
  EmptyTextTrack,
  NotStartingAt0,
  Regular,
} from "../../contents/Smooth_static";

const {
  manifestInfos: emptyTextTrackManifestInfos,
  URLs: emptyTextTrackURLs,
} = EmptyTextTrack;
const {
  manifestInfos: NotStartingAt0ManifestInfos,
  URLs: NotStartingAt0URLs,
} = NotStartingAt0;
const { manifestInfos: regularManifestInfos, URLs: regularURLs } = Regular;

describe("Smooth non-linear regular content", function () {
  launchTestsForContent(regularURLs, regularManifestInfos);
});

describe("Smooth non-linear with empty text track", function () {
  launchTestsForContent(emptyTextTrackURLs, emptyTextTrackManifestInfos);
});

describe("Smooth non-linear not starting at `0`", function () {
  launchTestsForContent(NotStartingAt0URLs, NotStartingAt0ManifestInfos);
});
