(function () {
  "use strict";

  var PAID_KEY = "notch_paid";
  var DEFAULT_TOL = { waist: 0.5, rise: 0.75, inseam: 1, thigh: 0.5 };

  var DIMS = [
    { user: "waist", item: "waist_in", tol: "waist" },
    { user: "rise", item: "rise_in", tol: "rise" },
    { user: "inseam", item: "inseam_in", tol: "inseam" },
    { user: "thigh", item: "thigh_in", tol: "thigh" }
  ];

  var form = document.getElementById("tape-form");
  var gate = document.getElementById("gate");
  var results = document.getElementById("results");
  var cards = document.getElementById("cards");
  var catalog = { items: [] };

  function readNumber(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var raw = String(el.value || "").trim();
    if (raw === "") return null;
    var n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function query() {
    return {
      waist: readNumber("waist"),
      rise: readNumber("rise"),
      inseam: readNumber("inseam"),
      thigh: readNumber("thigh"),
      tol: {
        waist: readNumber("tol-waist"),
        rise: readNumber("tol-rise"),
        inseam: readNumber("tol-inseam"),
        thigh: readNumber("tol-thigh")
      }
    };
  }

  function tolFor(q, key) {
    var t = q.tol[key];
    if (t == null) return DEFAULT_TOL[key];
    return t;
  }

  function itemMatches(item, q) {
    for (var i = 0; i < DIMS.length; i++) {
      var d = DIMS[i];
      var userVal = q[d.user];
      if (userVal == null) continue;
      if (d.user === "thigh" && (item.thigh_in === null || item.thigh_in === undefined)) {
        continue;
      }
      var published = Number(item[d.item]);
      if (!Number.isFinite(published)) {
        return false;
      }
      if (d.user === "thigh" && item.thigh_basis === "flat") published = published * 2;
      if (Math.abs(published - userVal) > tolFor(q, d.tol)) {
        return false;
      }
    }
    return true;
  }

  function isPaid() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get("paid") === "1") {
        window.localStorage.setItem(PAID_KEY, "1");
        params.delete("paid");
        var next = params.toString();
        var clean = window.location.pathname + (next ? "?" + next : "") + window.location.hash;
        window.history.replaceState({}, "", clean);
        return true;
      }
      return window.localStorage.getItem(PAID_KEY) === "1";
    } catch (err) {
      var fallback = new URLSearchParams(window.location.search);
      return fallback.get("paid") === "1";
    }
  }

  function fmt(n) {
    if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
    var x = Number(n);
    return Number.isInteger(x) ? String(x) : String(x);
  }

  function escapeText(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCard(item) {
    var url = item.url || "";
    var safeUrl = /^https?:\/\//i.test(url) ? url : "";
    var link = safeUrl
      ? '<a class="out" href="' + escapeText(safeUrl) + '" target="_blank" rel="noopener noreferrer">Brand page</a>'
      : "";
    var stretch = item.stretch ? escapeText(item.stretch) : "not listed";

    return (
      '<article class="card">' +
        '<p class="brand">' + escapeText(item.brand) + "</p>" +
        "<h3>" + escapeText(item.name) + "</h3>" +
        '<p class="size-label">Tag: ' + escapeText(item.size_label) + " — unused</p>" +
        '<p class="dims">' +
          "<span><b>Waist</b> " + fmt(item.waist_in) + "</span>" +
          "<span><b>Rise</b> " + fmt(item.rise_in) + "</span>" +
          "<span><b>Inseam</b> " + fmt(item.inseam_in) + "</span>" +
          "<span><b>Thigh</b> " + fmt(item.thigh_basis === "flat" && item.thigh_in != null ? Number(item.thigh_in) * 2 : item.thigh_in) + "</span>" +
        "</p>" +
        '<p class="stretch">Stretch: ' + stretch + "</p>" +
        link +
      "</article>"
    );
  }

  function render() {
    var paid = isPaid();
    gate.hidden = paid;
    results.hidden = !paid;
    if (!paid) {
      cards.innerHTML = "";
      return;
    }

    var q = query();
    var hits = (catalog.items || []).filter(function (item) {
      return itemMatches(item, q);
    });

    if (hits.length === 0) {
      cards.innerHTML =
        '<p class="empty">Nothing in this set matches those numbers. Stretch and vanity cuts still lie. Measure a pair you already like and try those.</p>';
      return;
    }

    cards.innerHTML = hits.map(renderCard).join("");
  }

  function loadCatalog() {
    var files = ["catalog-1.json", "catalog-2.json", "catalog-3.json", "catalog-4.json", "catalog-5.json", "catalog-6.json"];
    return Promise.all(files.map(function (f) {
      return fetch(f, { cache: "no-store" }).then(function (res) {
        if (!res.ok) throw new Error("catalog");
        return res.json();
      });
    })).then(function (parts) {
      var items = [];
      parts.forEach(function (data) {
        if (Array.isArray(data)) items = items.concat(data);
        else if (data && Array.isArray(data.items)) items = items.concat(data.items);
      });
      catalog = { items: items };
    }).catch(function () {
      catalog = { items: [] };
    });
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    render();
    var target = document.getElementById("results");
    if (target && !target.hidden) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (gate && !gate.hidden) {
      gate.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  var pay = document.getElementById("pay");
  if (pay) pay.href = "https://buy.stripe.com/cNi3cx8NtafHgHE6Xy87K04";

  loadCatalog().then(render);
})();
