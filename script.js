(() => {
  "use strict";

  const data = weddingData;
  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const teamsById = new Map(data.teams.map((team) => [team.id, team]));
  const statusText = { confirmed: "已確認", tentative: "暫定", pending: "待公布" };

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function personName(id) {
    return peopleById.get(id)?.name || "待公布";
  }

  function peopleNames(ids = []) {
    return ids.map(personName).join("、");
  }

  function statusBadge(status) {
    const badge = element("span", `status status-${status}`, statusText[status] || status);
    return badge;
  }

  function list(items, className = "") {
    const ul = element("ul", className);
    items.forEach((item) => ul.append(element("li", "", item)));
    return ul;
  }

  function validateData() {
    const errors = [];
    const ids = new Set();
    data.people.forEach(({ id }) => {
      if (ids.has(id)) errors.push(`重複的人員 ID：${id}`);
      ids.add(id);
    });
    const checkPeople = (idsToCheck, path) => idsToCheck.forEach((id) => {
      if (!ids.has(id)) errors.push(`${path} 找不到人員：${id}`);
    });
    data.management.forEach((item) => checkPeople([item.personId], `management.${item.role}`));
    data.teams.forEach((team) => {
      checkPeople(team.memberIds || [], `teams.${team.id}`);
      checkPeople(team.supportIds || [], `teams.${team.id}.supportIds`);
      checkPeople(team.candidateIds || [], `teams.${team.id}.candidateIds`);
      if (team.leaderId) checkPeople([team.leaderId], `teams.${team.id}.leaderId`);
    });
    data.assignments.forEach((item) => checkPeople([item.personId], "assignments"));
    data.cameraPositions.forEach((item) => {
      if (item.operatorId) checkPeople([item.operatorId], `cameraPositions.${item.id}`);
    });
    if (errors.length) console.error("[婚禮工作資料]", errors);
    return errors;
  }

  function renderHero() {
    document.querySelector("#hero-couple").textContent = data.weddingInfo.couple;
    document.querySelector("#hero-title").textContent = data.weddingInfo.title;
    document.querySelector("#hero-date").textContent = `${data.weddingInfo.dateShort}・${data.weddingInfo.weekday}`;
    document.querySelector("#hero-message").textContent = data.weddingInfo.message;

    const container = document.querySelector("#key-times");
    data.keyTimes.forEach((item) => {
      const link = element("a", "key-time");
      link.href = `#event-${item.scheduleId}`;
      link.append(element("strong", "", item.time), element("span", "", item.label));
      container.append(link);
    });
  }

  function renderTimeline() {
    const container = document.querySelector("#timeline-days");
    data.schedule.forEach((day) => {
      const daySection = element("section", "timeline-day");
      const header = element("header", "timeline-day-header");
      header.append(element("p", "", day.date), element("h3", "", day.title));
      const events = element("div", "timeline-list");

      day.events.forEach((eventData) => {
        const details = element("details", `timeline-event${eventData.featured ? " is-featured" : ""}`);
        details.id = `event-${eventData.id}`;
        const summary = element("summary");
        const time = element("time", "timeline-time", eventData.time);
        const main = element("div", "timeline-main");
        const titleRow = element("div", "timeline-title-row");
        titleRow.append(element("h4", "", eventData.title));
        if (eventData.status !== "confirmed") titleRow.append(statusBadge(eventData.status));
        main.append(titleRow, element("p", "", eventData.summary));
        summary.append(time, main, element("span", "expand-mark", "＋"));
        details.append(summary);

        if (eventData.details?.length || eventData.note) {
          const content = element("div", "timeline-detail");
          if (eventData.details?.length) content.append(list(eventData.details));
          if (eventData.note) content.append(element("p", "note", eventData.note));
          details.append(content);
        } else {
          details.classList.add("no-detail");
        }
        events.append(details);
      });
      daySection.append(header, events);
      container.append(daySection);
    });
  }

  function renderManagement() {
    const container = document.querySelector("#management-grid");
    data.management.forEach((item) => {
      const card = element("article", "management-card");
      const top = element("div", "management-top");
      top.append(element("p", "card-label", item.role), element("h4", "", personName(item.personId)));
      card.append(top, list(item.duties));
      if (item.note) card.append(element("p", "note", item.note));
      container.append(card);
    });
  }

  function renderTeams() {
    const container = document.querySelector("#team-grid");
    data.teams.forEach((team, index) => {
      const details = element("details", "team-card");
      const summary = element("summary");
      const intro = element("div", "team-intro");
      const count = String(index + 1).padStart(2, "0");
      const labelRow = element("div", "team-label-row");
      labelRow.append(element("span", "team-number", count));
      if (team.status !== "confirmed") labelRow.append(statusBadge(team.status));
      intro.append(labelRow, element("h4", "", team.name));

      const members = element("div", "team-members");
      if (team.leaderId) {
        const leader = element("p");
        leader.append(element("span", "", "負責人"), document.createTextNode(personName(team.leaderId)));
        members.append(leader);
      }
      const people = element("p");
      people.append(element("span", "", team.memberIds.length ? "人員" : "人員"), document.createTextNode(team.memberIds.length ? peopleNames(team.memberIds) : "待公布"));
      members.append(people);
      if (team.supportIds?.length) {
        const support = element("p");
        support.append(element("span", "", "機動支援"), document.createTextNode(peopleNames(team.supportIds)));
        members.append(support);
      }
      if (team.candidateIds?.length) {
        const candidates = element("p");
        candidates.append(element("span", "", "姓名待核對"), document.createTextNode(peopleNames(team.candidateIds)));
        members.append(candidates);
      }
      if (team.deadline) members.append(element("p", "team-deadline", team.deadline));
      summary.append(intro, members, element("span", "expand-mark", "＋"));
      details.append(summary);

      const body = element("div", "team-body");
      team.periods.forEach((period) => {
        const section = element("section", "team-period");
        section.append(element("h5", "", period.label), list(period.items));
        body.append(section);
      });
      if (team.notes?.length) {
        const notes = element("div", "team-notes");
        notes.append(element("strong", "", "重要注意事項"), list(team.notes));
        body.append(notes);
      }
      details.append(body);
      container.append(details);
    });
  }

  function renderHandoffs() {
    const container = document.querySelector("#handoff-grid");
    data.assignments.forEach((item) => {
      const card = element("article", "handoff-card");
      card.append(element("h4", "", personName(item.personId)));
      const flow = element("p", "handoff-flow");
      flow.append(element("span", "", item.from), element("i", "", item.trigger), element("strong", "", item.to));
      card.append(flow, element("p", "handoff-return", item.returnTo));
      container.append(card);
    });
  }

  function renderVenues() {
    document.querySelector("#ceremony-venue").textContent = data.weddingInfo.ceremonyVenue;
    document.querySelector("#ceremony-address").textContent = data.weddingInfo.ceremonyAddress;
    const map = document.querySelector("#ceremony-map");
    map.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.weddingInfo.ceremonyVenue} ${data.weddingInfo.ceremonyAddress}`)}`;
    map.setAttribute("aria-label", `開啟 ${data.weddingInfo.ceremonyVenue} 地圖（新分頁）`);

    const container = document.querySelector("#venue-grid");
    data.venues.forEach((venue) => {
      const card = element("article", "venue-card");
      card.append(element("p", "card-label", venue.purpose), element("h3", "", venue.name));
      if (venue.capacity) card.append(element("p", "venue-capacity", venue.capacity));
      card.append(list(venue.items));
      if (venue.note) card.append(element("p", "note", venue.note));
      container.append(card);
    });

    document.querySelector("#seating-orientation").textContent = data.seating.orientation;
    const notes = document.querySelector("#seating-notes");
    [
      ["聾人保留座位", data.seating.reserved], ["親屬優先座位", data.seating.family],
      ["一般賓客座位", data.seating.general], ["大合照場地轉換", data.seating.removal]
    ].forEach(([title, text]) => {
      const item = element("article");
      item.append(element("h4", "", title), element("p", "", text));
      notes.append(item);
    });
    renderFloorPlan("ceremony");
  }

  function chair(x, y, kind, label) {
    return `<g class="seat ${kind}" aria-label="${label}"><rect x="${x}" y="${y}" width="24" height="19" rx="4"></rect></g>`;
  }

  function renderFloorPlan(mode) {
    const plan = document.querySelector("#floor-plan-wrap");
    const isPhoto = mode === "photo";
    const rows = [];
    const firstRow = isPhoto ? 3 : 0;
    for (let row = firstRow; row < 6; row += 1) {
      const y = 142 + row * 39;
      for (let side = 0; side < 2; side += 1) {
        for (let col = 0; col < 6; col += 1) {
          const x = 58 + side * 244 + col * 31;
          let kind = "general";
          let label = "一般賓客座位";
          if (row < 3 && side === 0 && col < 4) { kind = "reserved"; label = "聾人保留座位"; }
          else if (row < 4) { kind = "family"; label = "親屬優先座位"; }
          rows.push(chair(x, y, kind, label));
        }
      }
    }
    const stageAndPhotoArea = isPhoto
      ? `<rect class="photo-zone" x="43" y="55" width="448" height="189" rx="10"></rect>
         <path class="stage-boundary" d="M 43 118 H 491"></path>
         <text class="zone-label" x="267" y="91" text-anchor="middle">講台已完全清空</text>
         <text class="zone-label" x="267" y="179" text-anchor="middle">大合照拍攝空間</text>
         <text class="removal-label" x="267" y="201" text-anchor="middle">前三排椅子已撤除</text>`
      : `<rect class="stage" x="43" y="55" width="448" height="63" rx="10"></rect>
         <text class="stage-label" x="88" y="88">手語區</text>
         <text class="stage-label" x="235" y="88">講桌</text>
         <text class="stage-label" x="388" y="88">新人座位</text>
         <rect class="removal-zone" x="43" y="55" width="448" height="189" rx="10"></rect>
         <text class="removal-label" x="267" y="133" text-anchor="middle">節目後清空講台並撤除前三排</text>`;
    const description = isPhoto
      ? "講台用品已移走，前三排椅子已撤除，兩區合併作為大合照拍攝空間。其餘座位可供親屬及有需要的賓客等待。"
      : "以賓客面向講台為準，聾人保留座位在最左側靠牆四席、連續前三排。正式婚禮節目後完全清空講台並撤除前三排椅子。";

    plan.innerHTML = `<svg class="floor-plan" viewBox="0 0 534 430" role="img" aria-labelledby="plan-title" aria-describedby="plan-desc">
      <title id="plan-title">聚會所${isPhoto ? "大合照期間" : "婚禮期間"}配置示意</title>
      <desc id="plan-desc">${description}詢問處位於聚會所後方，提供資訊及接收禮物。</desc>
      <rect class="room" x="18" y="18" width="498" height="394" rx="18"></rect>
      <text class="orientation-label" x="267" y="40" text-anchor="middle">賓客面向講台</text>
      ${stageAndPhotoArea}
      <line class="aisle-line" x1="267" y1="${isPhoto ? 246 : 140}" x2="267" y2="371"></line><text class="aisle-label" x="267" y="350" text-anchor="middle">中央走道</text>
      ${rows.join("")}
      <rect class="desk" x="375" y="373" width="108" height="26" rx="6"></rect><text class="desk-label" x="429" y="391" text-anchor="middle">詢問處・禮物</text>
      <text class="wall-label" x="32" y="260" transform="rotate(-90 32 260)" text-anchor="middle">最靠左側牆壁</text>
    </svg><p class="diagram-disclaimer">${data.seating.disclaimer}</p>`;
  }

  function setupDiagramTabs() {
    document.querySelectorAll(".diagram-tab").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".diagram-tab").forEach((item) => {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderFloorPlan(button.dataset.diagram);
      });
    });
  }

  function renderProgram() {
    document.querySelector("#ceremony-range").textContent = `${data.ceremony.start} 開始・${data.ceremony.targetEnd}`;
    const ceremonyList = document.querySelector("#ceremony-list");
    data.ceremony.items.forEach((item) => {
      const li = element("li");
      const content = element("div");
      const title = element("h4", "", item.title);
      if (item.status !== "confirmed") title.append(statusBadge(item.status));
      content.append(title);
      if (item.detail) content.append(element("p", "", item.detail));
      li.append(content);
      ceremonyList.append(li);
    });

    const cameraGrid = document.querySelector("#camera-grid");
    data.cameraPositions.forEach((camera) => {
      const card = element("article", "camera-card");
      const head = element("div", "camera-head");
      head.append(element("span", "camera-id", camera.id), element("h4", "", camera.operatorId ? personName(camera.operatorId) : camera.operator));
      card.append(head, element("p", "camera-meta", `${camera.device}・${camera.place}`), element("p", "", camera.work));
      cameraGrid.append(card);
    });

    const table = element("table");
    const thead = element("thead");
    const tr = element("tr");
    ["婚禮環節", "畫面", "音訊及其他操作"].forEach((heading) => tr.append(element("th", "", heading)));
    thead.append(tr);
    const tbody = element("tbody");
    data.avCues.forEach((cue) => {
      const row = element("tr");
      [["婚禮環節", cue.moment], ["畫面", cue.video], ["音訊及其他操作", cue.audio]].forEach(([label, value]) => {
        const cell = element("td", "", value);
        cell.dataset.label = label;
        row.append(cell);
      });
      tbody.append(row);
    });
    table.append(thead, tbody);
    document.querySelector("#av-cues").append(table);
    document.querySelector("#av-checklist").append(...data.avChecklist.map((item) => element("li", "", item)));
    document.querySelector("#equipment-list").append(...data.equipment.map((item) => element("li", "", item)));
  }

  function renderPhotos() {
    document.querySelector("#group-photo-photographer").textContent = personName(data.photoGroups.photographerId);
    document.querySelector("#group-photo-host").textContent = data.photoGroups.host;
    const message = document.querySelector("#photo-groups-message");
    message.append(statusBadge(data.photoGroups.status), element("strong", "", data.photoGroups.message));
    document.querySelector("#group-photo-coordination").textContent = data.photoGroups.coordination;
    const steps = document.querySelector("#group-photo-steps");
    data.photoGroups.steps.forEach((step) => steps.append(element("li", "", step)));
  }

  function renderCleanup() {
    const times = document.querySelector("#cleanup-times");
    data.cleanup.keyTimes.forEach((item) => {
      const block = element("div");
      block.append(element("strong", "", item.time), element("span", "", item.label));
      times.append(block);
    });

    const grid = document.querySelector("#cleanup-grid");
    data.cleanup.areas.forEach((area) => {
      const card = element("article", "cleanup-card");
      const head = element("div", "cleanup-head");
      head.append(element("h3", "", area.name), element("p", "", `負責人｜${personName(area.leaderId)}`));
      card.append(head, list(area.items), element("p", "note", area.note));
      grid.append(card);
    });

    const logistics = document.querySelector("#logistics-grid");
    data.cleanup.logistics.forEach((item) => {
      const card = element("article", "logistics-card");
      const head = element("div");
      head.append(element("h4", "", item.title));
      if (item.status !== "confirmed") head.append(statusBadge(item.status));
      card.append(head, element("p", "", item.text));
      logistics.append(card);
    });

    document.querySelector("#reception-title").textContent = data.reception.venue;
    document.querySelector("#reception-hall").textContent = data.reception.hall;
    data.reception.times.forEach((item) => {
      const time = element("div");
      time.append(element("strong", "", item.time), element("span", "", item.label));
      if (item.status) time.append(statusBadge(item.status));
      document.querySelector("#reception-times").append(time);
    });
    document.querySelector("#reception-team").textContent = data.reception.advanceTeam;
    document.querySelector("#reception-tasks").append(...data.reception.advanceTasks.map((item) => element("li", "", item)));
    document.querySelector("#reception-note").textContent = data.reception.note;
  }

  function setupDetails() {
    document.querySelectorAll("details").forEach((details) => {
      details.addEventListener("toggle", () => {
        const mark = details.querySelector(":scope > summary .expand-mark");
        if (mark) mark.textContent = details.open ? "−" : "＋";
      });
    });
  }

  function setupNavState() {
    const links = [...document.querySelectorAll(".nav-scroll a")];
    const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.toggle("is-current", link.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-25% 0px -65%", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }

  validateData();
  renderHero();
  renderTimeline();
  renderManagement();
  renderTeams();
  renderHandoffs();
  renderVenues();
  renderProgram();
  renderPhotos();
  renderCleanup();
  setupDiagramTabs();
  setupDetails();
  setupNavState();
})();
