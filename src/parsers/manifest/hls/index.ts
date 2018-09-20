/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import parseMasterPlaylist from "./parseMasterPlaylist";
import type { IHLSPlaylistParserResponse } from "./parseMasterPlaylist";
export default parseMasterPlaylist;
export type { IHLSPlaylistParserResponse };
