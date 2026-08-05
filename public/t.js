// PulseTrack — Lightweight analytics tracking script (~2KB)
// Usage: <script defer src="https://pulsetrack.io/t.js" data-site="SITE_ID"></script>
(function () {
  "use strict";

  // Get config from script tag
  var script = document.currentScript;
  if (!script) return;

  var siteId = script.getAttribute("data-site");
  if (!siteId) return;

  // API endpoint — same origin as the script
  var endpoint = script.src.replace(/\/t\.js$/, "/api/track");

  // Generate or retrieve session ID (expires after 30 min of inactivity)
  var SESSION_KEY = "_pt_sid";
  var SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  function getSessionId() {
    var stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      var parsed = JSON.parse(stored);
      if (Date.now() - parsed.t < SESSION_TIMEOUT) {
        parsed.t = Date.now();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        return parsed.id;
      }
    }
    var id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: id, t: Date.now() }));
    return id;
  }

  // Collect page data
  function getPageData() {
    return {
      site_id: siteId,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || null,
      title: document.title || null,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      language: navigator.language || null,
      session_id: getSessionId(),
      timestamp: new Date().toISOString(),
    };
  }

  // Extract UTM parameters
  function getUtmParams() {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(function (key) {
      var val = params.get(key);
      if (val) utm[key] = val;
    });
    return Object.keys(utm).length > 0 ? utm : null;
  }

  // Send event to API
  function send(type, extra) {
    var data = getPageData();
    data.type = type;
    data.utm = getUtmParams();
    if (extra) {
      for (var key in extra) {
        data[key] = extra[key];
      }
    }

    // Use sendBeacon for reliability (fires even on page close)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(data));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify(data));
    }
  }

  // Track page view
  function trackPageview() {
    send("pageview");
  }

  // Track page leave (duration)
  var pageEnteredAt = Date.now();
  function trackLeave() {
    var duration = Math.round((Date.now() - pageEnteredAt) / 1000);
    send("leave", { duration: duration });
  }

  // Listen for page visibility change and beforeunload
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      trackLeave();
    }
  });

  // Handle SPA navigation (pushState / popstate)
  var lastPath = window.location.pathname;

  function handleNavigation() {
    var newPath = window.location.pathname;
    if (newPath !== lastPath) {
      trackLeave();
      lastPath = newPath;
      pageEnteredAt = Date.now();
      trackPageview();
    }
  }

  // Monkey-patch pushState and replaceState for SPA support
  var originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    handleNavigation();
  };

  var originalReplaceState = history.replaceState;
  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    handleNavigation();
  };

  window.addEventListener("popstate", handleNavigation);

  // Expose global function for custom events
  window.pulsetrack = function (eventName, props) {
    send("event", { event_name: eventName, event_props: props || {} });
  };

  // Fire initial pageview
  trackPageview();
})();
