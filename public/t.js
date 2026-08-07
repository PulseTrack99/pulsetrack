// PulseTrack — cookie-free analytics
// <script defer src="https://pulsetrack.io/t.js" data-site="SITE_ID"></script>
//
// Writes nothing to the visitor's device: no cookie, no localStorage, no
// sessionStorage. Visitors are identified server-side from a daily-rotating
// salted hash, so there is nothing here that requires consent.
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

  var endpoint = script.src.replace(/\/t\.js$/, "/api/track");

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

    var payload = JSON.stringify(data);

    // sendBeacon survives the page being closed mid-request.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, payload);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(payload);
    }
  }

  function trackPageview() {
    send("pageview");
  }

  // ── Time on page ──
  var enteredAt = Date.now();
  var leaveSent = false;

  function trackLeave() {
    if (leaveSent) return;
    leaveSent = true;
    send("leave", { duration: Math.round((Date.now() - enteredAt) / 1000) });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") trackLeave();
  });
  // pagehide covers the bfcache and iOS Safari, where visibilitychange
  // is not guaranteed to fire before the page is frozen.
  window.addEventListener("pagehide", trackLeave);

  // ── SPA navigation ──
  var lastPath = location.pathname;

  function handleNavigation() {
    if (location.pathname === lastPath) return;
    trackLeave();
    lastPath = location.pathname;
    enteredAt = Date.now();
    leaveSent = false;
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

  // ── Public API ──
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
