(() => {
  "use strict";
  const endpoint = window.weddingStaffConfig?.publishedUrl || "";
  const enabled = /^https:\/\/script\.google\.com\/(?:a\/macros\/[a-z0-9.-]+\/|macros\/)s\/[\w-]+\/exec$/.test(endpoint);
  const kind = "wedding-staff-published";
  const key = `wedding-staff:v1:${endpoint}`;
  const nonce = location.hash.match(/^#staff-preview=([a-f0-9-]{36})$/)?.[1];
  const preview = Boolean(nonce && window.parent !== window);

  function isData(data) {
    if (!data || !data.weddingInfo || !Array.isArray(data.people)) return false;
    const sections = data.sections || {};
    return (sections.schedule || Array.isArray(data.schedule) && Array.isArray(data.keyTimes)) &&
      (sections.teams || Array.isArray(data.teams) && Array.isArray(data.management) && Array.isArray(data.assignments)) &&
      (sections.venues || Array.isArray(data.venues) && data.seating) &&
      (sections.program || Array.isArray(data.ceremony?.items) && Array.isArray(data.cameraPositions) &&
        Array.isArray(data.avCues) && Array.isArray(data.avChecklist) && Array.isArray(data.equipment)) &&
      (sections.photos || Array.isArray(data.photoGroups?.steps)) &&
      (sections.cleanup || Array.isArray(data.cleanup?.areas) && Array.isArray(data.cleanup?.keyTimes) &&
        Array.isArray(data.cleanup?.logistics)) &&
      (sections.reception || Array.isArray(data.reception?.times) && Array.isArray(data.reception?.advanceTasks));
  }

  function published(payload) {
    return payload?.ok === true && payload.kind === kind && Number.isSafeInteger(payload.version) &&
      payload.version > 0 && Number.isFinite(Date.parse(payload.updatedAt)) && isData(payload.data);
  }

  function readCache() {
    if (!enabled || preview) return null;
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return published(value) ? value : null;
    } catch {
      return null;
    }
  }

  function remember(payload) {
    if (preview || !enabled || !published(payload)) return;
    try { localStorage.setItem(key, JSON.stringify(payload)); } catch { /* Browser storage can be unavailable. */ }
  }

  async function readJson() {
    const url = new URL(endpoint);
    url.searchParams.set("t", String(Date.now()));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(url, { cache: "no-store", credentials: "omit", signal: controller.signal });
      if (!response.ok) throw new Error("無法讀取發布資料");
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function readJsonp() {
    // Apps Script Content Service can redirect to googleusercontent.com.
    const random = crypto.getRandomValues(new Uint8Array(16));
    const token = [...random].map((value) => value.toString(16).padStart(2, "0")).join("");
    const callback = `weddingStaffRead_${token}`;
    const url = new URL(endpoint);
    url.searchParams.set("callback", callback);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      function finish(error, value) {
        clearTimeout(timer);
        // An already queued response can arrive after the timeout.
        window[callback] = () => {};
        setTimeout(() => delete window[callback], 10000);
        script.remove();
        if (error) reject(error);
        else resolve(value);
      }
      const timer = setTimeout(() => finish(new Error("讀取逾時")), 6000);
      window[callback] = (value) => finish(null, value);
      script.onerror = () => finish(new Error("無法讀取發布資料"));
      script.src = url.href;
      document.head.append(script);
    });
  }

  async function getLatest() {
    if (!enabled || preview) throw new Error("公開端點未設定");
    const payload = await readJson().catch(readJsonp);
    if (payload?.ok === false && payload.error === "目前無法取得已發布資料。") {
      const error = new Error("公開端已回應，暫無可讀取的發布資料");
      error.code = "PUBLISHED_UNAVAILABLE";
      throw error;
    }
    if (!published(payload)) throw new Error("公開端回應格式不符");
    return payload;
  }

  function previewData(onData) {
    let finished = false;
    function receive(event) {
      if (finished || event.source !== window.parent || !/^https:\/\/(?:[\w-]+\.)*googleusercontent\.com$|^https:\/\/script\.google\.com$/.test(event.origin)) return;
      if (event.data?.type !== "staff-preview-data" || event.data.nonce !== nonce || !isData(event.data.data)) return;
      finished = true;
      window.removeEventListener("message", receive);
      onData(event.data.data);
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "staff-preview-ready", nonce }, "*");
  }

  window.weddingStaffSource = { enabled, preview, readCache, remember, getLatest, previewData };
})();
