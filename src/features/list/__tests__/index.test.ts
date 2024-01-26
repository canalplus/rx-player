import { DASH as DASH_FEATURE } from "../dash";
import { DASH_WASM as DASH_WASM_FEATURE } from "../dash_wasm";
import { DEBUG_ELEMENT as DEBUG_ELEMENT_FEATURE } from "../debug_element";
import { DIRECTFILE as DIRECTFILE_FEATURE } from "../directfile";
import { EME as EME_FEATURE } from "../eme";
import { HTML_SAMI_PARSER as HTML_SAMI_PARSER_FEATURE } from "../html_sami_parser";
import { HTML_SRT_PARSER as HTML_SRT_PARSER_FEATURE } from "../html_srt_parser";
import { HTML_TEXT_BUFFER as HTML_TEXT_BUFFER_FEATURE } from "../html_text_buffer";
import { HTML_TTML_PARSER as HTML_TTML_PARSER_FEATURE } from "../html_ttml_parser";
import { HTML_VTT_PARSER as HTML_VTT_PARSER_FEATURE } from "../html_vtt_parser";
import {
  DASH,
  DASH_WASM,
  DIRECTFILE,
  DEBUG_ELEMENT,
  EME,
  HTML_SAMI_PARSER,
  HTML_SRT_PARSER,
  HTML_TEXT_BUFFER,
  HTML_TTML_PARSER,
  HTML_VTT_PARSER,
  NATIVE_SAMI_PARSER,
  NATIVE_SRT_PARSER,
  NATIVE_TEXT_BUFFER,
  NATIVE_TTML_PARSER,
  NATIVE_VTT_PARSER,
  SMOOTH,
} from "../index";
import { NATIVE_SAMI_PARSER as NATIVE_SAMI_PARSER_FEATURE } from "../native_sami_parser";
import { NATIVE_SRT_PARSER as NATIVE_SRT_PARSER_FEATURE } from "../native_srt_parser";
import { NATIVE_TEXT_BUFFER as NATIVE_TEXT_BUFFER_FEATURE } from "../native_text_buffer";
import { NATIVE_TTML_PARSER as NATIVE_TTML_PARSER_FEATURE } from "../native_ttml_parser";
import { NATIVE_VTT_PARSER as NATIVE_VTT_PARSER_FEATURE } from "../native_vtt_parser";
import { SMOOTH as SMOOTH_FEATURE } from "../smooth";

describe("Features list", () => {
  it("should export all stable features", () => {
    expect(DASH).toBe(DASH_FEATURE);
    expect(DASH_WASM).toBe(DASH_WASM_FEATURE);
    expect(DIRECTFILE).toBe(DIRECTFILE_FEATURE);
    expect(EME).toBe(EME_FEATURE);
    expect(HTML_SAMI_PARSER).toBe(HTML_SAMI_PARSER_FEATURE);
    expect(HTML_SRT_PARSER).toBe(HTML_SRT_PARSER_FEATURE);
    expect(HTML_TEXT_BUFFER).toBe(HTML_TEXT_BUFFER_FEATURE);
    expect(HTML_TTML_PARSER).toBe(HTML_TTML_PARSER_FEATURE);
    expect(HTML_VTT_PARSER).toBe(HTML_VTT_PARSER_FEATURE);
    expect(NATIVE_SAMI_PARSER).toBe(NATIVE_SAMI_PARSER_FEATURE);
    expect(NATIVE_SRT_PARSER).toBe(NATIVE_SRT_PARSER_FEATURE);
    expect(NATIVE_TEXT_BUFFER).toBe(NATIVE_TEXT_BUFFER_FEATURE);
    expect(NATIVE_TTML_PARSER).toBe(NATIVE_TTML_PARSER_FEATURE);
    expect(NATIVE_VTT_PARSER).toBe(NATIVE_VTT_PARSER_FEATURE);
    expect(SMOOTH).toBe(SMOOTH_FEATURE);
    expect(DEBUG_ELEMENT).toBe(DEBUG_ELEMENT_FEATURE);
  });
});
