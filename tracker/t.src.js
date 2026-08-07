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

  function push(rec) {
    buf.push(rec);
    if (buf.length >= 24) flush();
  }

  function flush() {
    if (!buf.length) return;
    var batch = buf;
    buf = [];
    post(
      hmEndpoint,
      JSON.stringify({ site_id: siteId, path: location.pathname, batch: batch })
    );
  }

  function captureClick(e) {
    var el = e.target;
    if (!el || el.nodeType !== 1) return;

    var docW = document.documentElement.scrollWidth || window.innerWidth;
    var x = e.pageX;
    var y = e.pageY;

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

  trackPageview();
})();
