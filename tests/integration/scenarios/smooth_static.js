import launchTestsForContent from "../utils/launch_tests_for_content.js";

import {
  EmptyTextTrack,
  NotStartingAt0,
  Regular,
} from "../../contents/Smooth_static";

const {
  manifestInfos: emptyTextTrackManifestInfos,
} = EmptyTextTrack;
const {
  manifestInfos: NotStartingAt0ManifestInfos,
} = NotStartingAt0;
const { manifestInfos: regularManifestInfos } = Regular;

describe("Smooth non-linear regular content", function () {
  launchTestsForContent(regularManifestInfos);
});

describe("Smooth non-linear with empty text track", function () {
  launchTestsForContent(emptyTextTrackManifestInfos);
});

describe("Smooth non-linear not starting at `0`", function () {
  launchTestsForContent(NotStartingAt0ManifestInfos);
});
