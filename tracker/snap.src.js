/**
 * Lazily-loaded DOM snapshot module.
 *
 * Bundled separately from t.js and fetched only when the server says it
 * has no recent snapshot for this page and breakpoint. rrweb's serialiser
 * is around ten times the weight of the whole core tracker, so making
 * every visitor download it to re-record a layout we already have would
 * throw away the thing that makes PulseTrack worth installing.
 *
 * In practice one visitor in a few hundred pays this cost.
 */

import { snapshot } from "rrweb-snapshot";

window.__ptSnap = function (opts) {
  try {
    const node = snapshot(document, {
      // Pull external CSS into the capture. Without it the replay loses
      // every style hosted on a domain the dashboard cannot fetch.
      inlineStylesheet: true,

      // Never record what a visitor typed. This is not configurable.
      maskAllInputs: true,

      // Site owners can hide regions from replay by marking them up.
      maskTextClass: "pt-mask",
      blockClass: "pt-block",
      maskTextSelector: "[data-pt-mask]",
      blockSelector: "[data-pt-block]",

      // Images stay as URLs rather than being inlined as data URIs, which
      // would multiply the payload for no gain in a click map.
      inlineImages: false,

      // Cross-origin stylesheets that refuse to be read are skipped
      // rather than aborting the whole capture.
      recordCanvas: false,
    });

    if (!node) return null;

    return {
      dom: node,
      viewport_w: window.innerWidth,
      doc_h: Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      ),
      captured_at: new Date().toISOString(),
      opts: opts || {},
    };
  } catch (e) {
    return null;
  }
};
