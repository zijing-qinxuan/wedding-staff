"use strict";
const adminUrl = window.weddingStaffConfig?.adminUrl;
if (/^https:\/\/script\.google\.com\/(?:a\/macros\/[a-z0-9.-]+\/|macros\/)s\/[\w-]+\/exec$/.test(adminUrl || "")) {
  const link = document.querySelector("#admin-sign-in");
  link.href = adminUrl;
  link.hidden = false;
  document.querySelector("#admin-message").textContent = "請選擇已授權的 Google 帳號進入管理。";
}
