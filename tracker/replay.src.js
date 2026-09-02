/**
 * Session recording module, loaded on demand.
 *
 * rrweb's record() is roughly twenty times the weight of the core
 * tracker, so it never ships to a visitor whose session was not selected
 * for recording — t.src.js asks the server first via /api/replay/gate
 * and only then injects this file.
 *
 * Privacy defaults are set here rather than left to the caller:
 *   - every input value is masked, unconditionally
 *   - site owners can exclude a region from replay with class="pt-block"
 *     (removed from the recording entirely) or class="pt-mask" /
 *     data-pt-mask (text replaced with asterisks)
 *   - canvas contents are never recorded
 */
import { record } from "rrweb";

window.__ptStartRecording = function (emit) {
  return record({
    emit,
    maskAllInputs: true,
    blockClass: "pt-block",
    blockSelector: "[data-pt-block]",
    maskTextClass: "pt-mask",
    maskTextSelector: "[data-pt-mask]",
    inlineStylesheet: true,
    inlineImages: false,
    recordCanvas: false,
    collectFonts: false,
    // A full snapshot every 15s bounds how much a dropped segment can
    // cost the replay — playback can resume at the next checkpoint
    // instead of needing every incremental mutation since the start.
    checkoutEveryNms: 15000,
    sampling: {
      mousemove: 50,
      scroll: 150,
      input: "last",
    },
  });
};
