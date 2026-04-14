import config from "../config";
import EnvDetector from "./env_detector";

/**
 * When talking about `ISOBMFF`/.mp4 metadata, the `pssh` is a box (a subpart of
 * that file) containing protection-related metadata that is then used to
 * interact with EME APIs.
 *
 * The idea in EME scenarios is that the EME player (here the RxPlayer) will
 * take that data and communicate it to the browser's CDM (Content Decryption
 * Module) through an EME API (generally `generateRequest`).
 *
 * There is a mechanism in place in browsers, presumably to facilitate that work
 * which is that when the browser sees a `pssh` box in media data (either linked
 * directly through a media element's `src` attribute or one communicated
 * through MSE API) it can send an `encrypted` event so a JS player can then
 * communicate it to the right EME API.
 *
 * However, in an MSE/EME player, we often are distrustful of letting the browser
 * do work that can without issue be already done on our side (due to being
 * burned too much time on some weird environment, where the spec isn't respected
 * to the letter). So instead historically in MSE scenarios, the RxPlayer read the
 * `pssh` itself, and then "patched it out" (replaced it with a `free` box,
 * effectively a no-op for ISOBMFF metadata) from the segment before giving it to
 * the browser's buffer so that we skip that now unnecessary browser round-trip
 * (the `encrypted` event) and supplementary API surface that could be broken.
 *
 * Several years pass without issue, but in early 2026, we found out that one
 * device, a "Streama" STB from DStv (owned by Multichoice) refuse to bufferise
 * segments which had this "optimization" performed.
 * We have no idea why, from our POV it's an issue on the browser integration side.
 * They don't disagree but they cannot update that part of their device easily.
 *
 * So we decided to fix it player-side. When discussing about it, we hesitated
 * between removing that "optimization" altogether or only for the specific device
 * where we identified the issue. I chose (though far from everyone agreed!) the
 * second solution (only for problematic device) because I feared changing
 * behavior too much compared to most of our previous versions could break
 * other devices, even if we saw that some other players such as the
 * shaka-player did not do that same optimization.
 *
 * @returns {boolean}
 */
export default function canPatchOutPsshBox(): boolean {
  const { PREVENT_PSSH_PATCHING } = config.getCurrent();
  if (
    PREVENT_PSSH_PATCHING ||
    EnvDetector.device === EnvDetector.DEVICES.StreamaMdp1001S
  ) {
    return false;
  }
  return true;
}
