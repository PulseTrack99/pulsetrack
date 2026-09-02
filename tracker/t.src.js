// PulseTrack — cookie-free analytics
// <script defer src="https://pulsetrack.io/t.js" data-site="SITE_ID"></script>
//
// Writes nothing to the visitor's device: no cookie, no localStorage, no
// sessionStorage. Visitors are identified server-side from a daily-rotating
// salted hash, so there is nothing here that requires consent.
//
// Add data-heatmap="off" to skip interaction capture entirely.
(function () {
  "use strict";

  // document.currentScript is null when a tag manager injects the tag, so
  // fall back to locating our own tag by its data-site attribute.
  var script =
    document.currentScript ||
    document.querySelector("script[data-site][src*='t.js']");
  if (!script) return;

  var siteId = script.getAttribute("data-site");
  if (!siteId) return;

  var base = script.src.replace(/\/t\.js$/, "");
  var endpoint = base + "/api/track";
  var hmEndpoint = base + "/api/heatmap";
  var replayEndpoint = base + "/api/replay/ingest";
  var heatmapOn = script.getAttribute("data-heatmap") !== "off";

  function post(url, payload) {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, payload);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(payload);
    }
  }

  /* ── Core analytics ─────────────────────────────────────────── */

  function getPageData() {
    return {
      site_id: siteId,
      url: location.href,
      path: location.pathname,
      referrer: document.referrer || null,
      title: document.title || null,
      screen_width: screen.width,
      screen_height: screen.height,
      language: navigator.language || null,
      timestamp: new Date().toISOString(),
    };
  }

  function getUtmParams() {
    var params = new URLSearchParams(location.search);
    var utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
      function (key) {
        var val = params.get(key);
        if (val) utm[key] = val;
      }
    );
    return Object.keys(utm).length ? utm : null;
  }

  function send(type, extra) {
    var data = getPageData();
    data.type = type;
    data.utm = getUtmParams();
    if (extra) {
      for (var key in extra) data[key] = extra[key];
    }
    post(endpoint, JSON.stringify(data));
  }

  function trackPageview() {
    send("pageview");
  }

  /* ── Interaction capture ────────────────────────────────────── */

  var buf = [];
  var maxScroll = 0;
  var recent = [];

  function docHeight() {
    var d = document.documentElement;
    var b = document.body;
    return Math.max(
      d.scrollHeight,
      d.offsetHeight,
      b ? b.scrollHeight : 0,
      b ? b.offsetHeight : 0
    );
  }

  // Short, stable-ish CSS path. Stops at the first id, caps at four
  // levels so the string stays small.
  function selectorFor(el) {
    var parts = [];
    var depth = 0;
    while (el && el.nodeType === 1 && el !== document.body && depth < 4) {
      var part = el.tagName.toLowerCase();
      if (el.id) {
        parts.unshift(part + "#" + el.id);
        break;
      }
      var cls =
        typeof el.className === "string" && el.className.trim()
          ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";
      part += cls;
      var parent = el.parentNode;
      if (parent && parent.children) {
        var same = 0;
        var index = 0;
        for (var i = 0; i < parent.children.length; i++) {
          if (parent.children[i].tagName === el.tagName) {
            same++;
            if (parent.children[i] === el) index = same;
          }
        }
        if (same > 1) part += ":nth-of-type(" + index + ")";
      }
      parts.unshift(part);
      el = el.parentNode;
      depth++;
    }
    return parts.join(">").slice(0, 200);
  }

  // Never reads .value — form contents must not leave the page.
  function labelFor(el) {
    var tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return (
        el.getAttribute("aria-label") ||
        el.getAttribute("placeholder") ||
        el.getAttribute("name") ||
        tag.toLowerCase()
      ).slice(0, 60);
    }
    return (el.innerText || el.textContent || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 60);
  }

  function isInteractive(el) {
    if (/^(A|BUTTON|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY)$/.test(el.tagName))
      return true;
    if (el.getAttribute("role") === "button") return true;
    if (el.hasAttribute("onclick")) return true;
    try {
      return getComputedStyle(el).cursor === "pointer";
    } catch (e) {
      return false;
    }
  }

  /* ── Page structure snapshot ──
     Records where things are, so the dashboard can redraw the layout
     under the heat instead of trying to frame the live page — which
     fails whenever the site blocks framing, sits behind auth, or is not
     reachable from the dashboard at all.

     Geometry only: boxes and a one-letter kind. No text, no attributes,
     no markup leaves the page. */

  var SNAPSHOT_MAX = 320;
  var snapshotSent = false;

  function kindOf(el, hasText) {
    var tag = el.tagName;
    if (tag === "IMG" || tag === "SVG" || tag === "VIDEO" || tag === "CANVAS" || tag === "PICTURE")
      return "i";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return "f";
    if (tag === "A" || tag === "BUTTON" || el.getAttribute("role") === "button") return "b";
    return hasText ? "t" : "c";
  }

  function captureSnapshot() {
    var docW = document.documentElement.scrollWidth || window.innerWidth;
    var docH = docHeight();
    if (!docW || !docH) return null;

    var out = [];
    var all = document.body.getElementsByTagName("*");
    var scrollX = window.scrollX;
    var scrollY = window.scrollY;

    for (var i = 0; i < all.length && out.length < SNAPSHOT_MAX; i++) {
      var el = all[i];
      var tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "LINK")
        continue;

      var r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 6) continue;

      // Wrappers that span most of the page add no information and would
      // paint over everything beneath them.
      if (r.width * r.height > docW * docH * 0.55) continue;

      var hasText = false;
      for (var n = 0; n < el.childNodes.length; n++) {
        var node = el.childNodes[n];
        if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim()) {
          hasText = true;
          break;
        }
      }
      var isLeaf = el.children.length === 0;
      var kind = kindOf(el, hasText);

      var size = 0;
      if (kind === "c" && !isLeaf) {
        // A wrapper only earns a box if it is visually present — a card
        // with a background or a border. Invisible layout divs would
        // otherwise bury the real content under a pile of rectangles.
        var visible = false;
        try {
          var cs = getComputedStyle(el);
          var bg = cs.backgroundColor;
          visible =
            (bg && bg !== "transparent" && bg.indexOf("rgba(0, 0, 0, 0)") === -1) ||
            parseFloat(cs.borderTopWidth) > 0 ||
            parseFloat(cs.borderLeftWidth) > 0 ||
            (cs.boxShadow && cs.boxShadow !== "none");
        } catch (e) {}
        if (!visible) continue;
      } else if (kind === "t") {
        try {
          size = parseFloat(getComputedStyle(el).fontSize) || 0;
        } catch (e) {}
      }

      // Labels for controls and headings only. These are the page's own
      // public signposts, and without them the wireframe is a grid of
      // grey rectangles nobody can recognise as their own page. Body
      // copy and form fields are never labelled — a form's contents must
      // not leave the page under any circumstance.
      var label = "";
      if (kind === "b" || (kind === "t" && size >= 20)) {
        label = (el.innerText || el.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 48);
      }

      out.push({
        x: +((r.left + scrollX) / docW).toFixed(4),
        y: +((r.top + scrollY) / docH).toFixed(4),
        w: +(r.width / docW).toFixed(4),
        h: +(r.height / docH).toFixed(4),
        k: kind,
        s: Math.round(size),
        l: label,
      });
    }

    return { viewport_w: window.innerWidth, doc_h: docH, elements: out };
  }

  var pendingSnapshot = null;

  /* ── Full DOM capture, loaded on demand ──
     rrweb's serialiser is roughly ten times the weight of this entire
     script, so it is a separate bundle that is fetched only when the
     server says it has no recent capture of this page at this
     breakpoint. In practice that is one visitor in a few hundred; the
     rest never download it. */

  function requestDomCapture() {
    var url =
      base +
      "/api/heatmap/snapshot?s=" +
      encodeURIComponent(siteId) +
      "&p=" +
      encodeURIComponent(location.pathname);

    fetch(url, { credentials: "omit" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (res) {
        if (!res || !res.need) return;
        loadSnapModule(function () {
          if (!window.__ptSnap) return;
          var snap = window.__ptSnap();
          if (!snap || !snap.dom) return;
          post(
            base + "/api/heatmap/snapshot",
            JSON.stringify({
              site_id: siteId,
              path: location.pathname,
              dom: snap.dom,
              viewport_w: snap.viewport_w,
              doc_h: snap.doc_h,
            })
          );
        });
      })
      .catch(function () {});
  }

  function loadSnapModule(done) {
    if (window.__ptSnap) return done();
    var s = document.createElement("script");
    s.src = base + "/snap.js";
    s.async = true;
    s.onload = done;
    s.onerror = function () {};
    document.head.appendChild(s);
  }

  // The geometry fallback is still taken shortly after load rather than
  // at flush time. A sticky or fixed header reports its on-screen
  // position, so capturing after the visitor has scrolled would pin the
  // navigation halfway down the page — and walking the DOM as the page is
  // being torn down would add work to the one moment that has to be fast.
  function scheduleSnapshot() {
    if (!heatmapOn || snapshotSent) return;
    setTimeout(function () {
      if (snapshotSent) return;
      try {
        pendingSnapshot = captureSnapshot();
      } catch (e) {}
      // Ask about the full capture once the cheap one is safely in hand,
      // so a slow or blocked request never costs us the fallback.
      try {
        requestDomCapture();
      } catch (e) {}
    }, 900);
  }

  function takeSnapshot() {
    if (snapshotSent || !pendingSnapshot) return null;
    snapshotSent = true;
    var snap = pendingSnapshot;
    pendingSnapshot = null;
    return snap;
  }

  function push(rec) {
    buf.push(rec);
    if (buf.length >= 24) flush();
  }

  function flush() {
    if (!buf.length) return;
    var batch = buf;
    buf = [];
    var payload = {
      site_id: siteId,
      path: location.pathname,
      batch: batch,
    };
    // Rides along on the first flush of the pageview only, so the extra
    // weight is paid once rather than on every batch.
    var snap = takeSnapshot();
    if (snap) payload.snapshot = snap;
    post(hmEndpoint, JSON.stringify(payload));
  }

  function captureClick(e) {
    var el = e.target;
    if (!el || el.nodeType !== 1) return;

    var docW = document.documentElement.scrollWidth || window.innerWidth;

    // pageX/pageY are absent or zero on some events — synthetic ones, and
    // certain mobile browsers. clientX plus the scroll offset is always
    // available and means the same thing, so derive rather than trust.
    var x = e.pageX || (e.clientX || 0) + window.scrollX;
    var y = e.pageY || (e.clientY || 0) + window.scrollY;

    // A click whose coordinates resolve to the origin is almost certainly
    // a programmatic dispatch, not a person. Recording it would put a hot
    // spot in the top-left corner of every map.
    if (x === 0 && y === 0) {
      var box = el.getBoundingClientRect();
      x = box.left + box.width / 2 + window.scrollX;
      y = box.top + box.height / 2 + window.scrollY;
    }

    var rec = {
      type: "click",
      x_ratio: Math.max(0, Math.min(1, x / docW)),
      y_px: Math.round(y),
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      doc_h: docHeight(),
      selector: selectorFor(el),
      elem_text: labelFor(el),
      interactive: isInteractive(el),
    };
    push(rec);

    // Rage click: three or more hits inside 30px within 800ms, on
    // something that does not respond. That combination is almost always
    // a visitor fighting a broken affordance.
    var now = Date.now();
    recent.push({ x: x, y: y, t: now });
    recent = recent.filter(function (p) {
      return now - p.t < 800;
    });
    var near = recent.filter(function (p) {
      return Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 30;
    });
    if (near.length >= 3 && !rec.interactive) {
      push({
        type: "rage",
        x_ratio: rec.x_ratio,
        y_px: rec.y_px,
        viewport_w: rec.viewport_w,
        viewport_h: rec.viewport_h,
        doc_h: rec.doc_h,
        selector: rec.selector,
        elem_text: rec.elem_text,
        interactive: false,
      });
      recent = [];
    }
  }

  function measureScroll() {
    var h = docHeight();
    if (h <= 0) return;
    var pct = Math.round(((window.scrollY + window.innerHeight) / h) * 100);
    if (pct > maxScroll) maxScroll = Math.min(100, pct);
  }

  // Throttled on a timestamp rather than requestAnimationFrame: rAF stops
  // firing once a tab is hidden, which is exactly when the page is about
  // to be left — so an rAF-gated reading loses the final scroll position
  // of every visitor who switches tab or closes it.
  var lastMeasure = 0;
  function onScroll() {
    var now = Date.now();
    if (now - lastMeasure < 150) return;
    lastMeasure = now;
    measureScroll();
  }

  function flushScroll() {
    // Take a final reading: the visitor may have scrolled since the last
    // throttled sample, and this runs as the page is going away.
    measureScroll();
    if (maxScroll <= 0) return;
    push({
      type: "scroll",
      scroll_pct: maxScroll,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      doc_h: docHeight(),
    });
    maxScroll = 0;
  }

  if (heatmapOn) {
    document.addEventListener("click", captureClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ── Time on page ───────────────────────────────────────────── */

  var enteredAt = Date.now();
  var leaveSent = false;

  function trackLeave() {
    if (leaveSent) return;
    leaveSent = true;
    send("leave", { duration: Math.round((Date.now() - enteredAt) / 1000) });
    if (heatmapOn) {
      flushScroll();
      flush();
      stopReplay(true);
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") trackLeave();
  });
  // pagehide covers the bfcache and iOS Safari, where visibilitychange
  // is not guaranteed to fire before the page is frozen.
  window.addEventListener("pagehide", trackLeave);

  /* ── SPA navigation ─────────────────────────────────────────── */

  var lastPath = location.pathname;

  function handleNavigation() {
    if (location.pathname === lastPath) return;
    trackLeave();
    lastPath = location.pathname;
    enteredAt = Date.now();
    leaveSent = false;
    maxScroll = 0;
    recent = [];
    // A client-side route change is a different page, so it needs its own
    // structure captured.
    snapshotSent = false;
    pendingSnapshot = null;
    scheduleSnapshot();
    // Same reasoning as pagehide: a route change is a new page, so it
    // gets its own recording rather than one that silently spans both.
    scheduleReplay();
    trackPageview();
  }

  var pushState = history.pushState;
  history.pushState = function () {
    pushState.apply(this, arguments);
    handleNavigation();
  };

  var replaceState = history.replaceState;
  history.replaceState = function () {
    replaceState.apply(this, arguments);
    handleNavigation();
  };

  window.addEventListener("popstate", handleNavigation);

  /* ── Session replay ──
     A recording is one page load: rrweb cannot resume the same event
     stream across a real navigation, since JavaScript execution restarts
     from scratch (see supabase/session-replays.sql). Whether a given
     page load gets recorded at all is decided server-side — /api/replay/gate
     answers based on the site's plan and this month's remaining quota —
     so a visitor whose recording will not be kept never downloads
     rrweb's record module, which is by far the heaviest thing this
     tracker can load. */

  var replayId = null;
  var replayStop = null;
  var replayBuf = [];
  var replayBytes = 0;
  var replaySeq = 0;
  var replayTimer = null;
  var replayCapTimer = null;

  function randomId() {
    if (window.crypto && window.crypto.randomUUID) return crypto.randomUUID();
    return (
      Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
    );
  }

  function postReplay(payload) {
    var body = JSON.stringify(payload);
    // Segments can run larger than the click/scroll batches elsewhere in
    // this file — a full-snapshot checkpoint on a heavy page can be
    // sizeable — so this prefers fetch+keepalive, which browsers give a
    // far larger allowance than sendBeacon's payload cap, falling back
    // to the same beacon/XHR path everything else here uses.
    if (window.fetch) {
      fetch(replayEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
        credentials: "omit",
      }).catch(function () {
        post(replayEndpoint, body);
      });
    } else {
      post(replayEndpoint, body);
    }
  }

  function flushReplay(done) {
    if (!replayBuf.length && !done) return;
    if (!replayId) return;
    var batch = replayBuf;
    replayBuf = [];
    replayBytes = 0;
    var seq = replaySeq++;
    postReplay({
      site_id: siteId,
      replay_id: replayId,
      path: location.pathname,
      seq: seq,
      events: batch,
      done: Boolean(done),
    });
  }

  function onReplayEvent(event, isCheckout) {
    // rrweb signals a fresh full snapshot with isCheckout — the natural
    // place to close the current segment, so the checkout event opens
    // the next one rather than landing mid-batch.
    if (isCheckout && replayBuf.length) flushReplay(false);
    replayBuf.push(event);
    try {
      replayBytes += JSON.stringify(event).length;
    } catch (e) {}
    if (replayBuf.length >= 150 || replayBytes > 40000) flushReplay(false);
  }

  function stopReplay(final) {
    if (replayTimer) clearInterval(replayTimer);
    if (replayCapTimer) clearTimeout(replayCapTimer);
    replayTimer = null;
    replayCapTimer = null;
    if (replayStop) {
      try {
        replayStop();
      } catch (e) {}
      replayStop = null;
    }
    if (replayId) flushReplay(Boolean(final));
    replayId = null;
  }

  function loadReplayModule(done) {
    if (window.__ptStartRecording) return done();
    var s = document.createElement("script");
    s.src = base + "/replay.js";
    s.async = true;
    s.onload = done;
    s.onerror = function () {};
    document.head.appendChild(s);
  }

  // A tab left open all day should not accumulate one unbounded
  // recording — thirty minutes is ample to see what happened and bounds
  // the worst case for both storage and the player's own memory.
  var MAX_REPLAY_MS = 30 * 60 * 1000;

  // rrweb reads window.innerWidth/innerHeight once, at the moment
  // record() is called, and bakes it into the Meta event the player
  // later sizes its iframe from. A tab that has not finished laying out
  // yet (or is momentarily hidden — some browsers report 0 there) hands
  // back a 0×0 viewport, and every replay recorded in that instant is
  // permanently unplayable: there is no later event that corrects it.
  // A few short retries costs nothing against a 30-minute recording and
  // means that never happens.
  function whenViewportReady(cb, triesLeft) {
    if (window.innerWidth > 0 && window.innerHeight > 0) return cb();
    if (triesLeft <= 0) return; // never became ready — skip this recording
    setTimeout(function () {
      whenViewportReady(cb, triesLeft - 1);
    }, 200);
  }

  function scheduleReplay() {
    if (!heatmapOn) return;
    fetch(base + "/api/replay/gate?s=" + encodeURIComponent(siteId), {
      credentials: "omit",
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (res) {
        if (!res || !res.record) return;
        loadReplayModule(function () {
          if (!window.__ptStartRecording) return;
          whenViewportReady(function () {
            replayId = randomId();
            replaySeq = 0;
            replayBuf = [];
            replayBytes = 0;
            replayStop = window.__ptStartRecording(onReplayEvent);
            replayTimer = setInterval(function () {
              flushReplay(false);
            }, 6000);
            replayCapTimer = setTimeout(function () {
              stopReplay(true);
            }, MAX_REPLAY_MS);
          }, 10);
        });
      })
      .catch(function () {});
  }

  /* ── Public API ─────────────────────────────────────────────── */

  // Callable directly, pulsetrack("signup", { plan: "growth" }),
  // or via .track() for readability. Both do the same thing.
  var api = function (eventName, props) {
    send("event", { event_name: eventName, event_props: props || {} });
  };

  api.track = api;

  // Links this visitor to a customer so revenue can be attributed.
  api.identify = function (email) {
    if (email && typeof email === "string") {
      send("identify", { email: email.trim().toLowerCase() });
    }
  };

  window.pulsetrack = api;

  scheduleSnapshot();
  scheduleReplay();
  trackPageview();
})();
