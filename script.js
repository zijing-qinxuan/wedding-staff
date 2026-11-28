(() => {
  "use strict";

  const source = window.weddingStaffSource;
  const find = (id) => document.getElementById(id);
  const today = "wedding-day";
  const sections = ["schedule", "teams", "guides", "reception"];
  const groupDefinitions = [
    { id: "ushers", title: "招待組", teams: ["hall-a-ushers", "hall-b-ushers", "downstairs-ushers", "badges"] },
    { id: "av", title: "影音及直播組", teams: ["av", "hall-b-av", "livestream"] },
    { id: "photography", title: "攝影及大合照", teams: ["documentary-photo", "group-photo-host", "backdrop-photo-print", "backdrop-setup", "photo-lighting"] }
  ];
  let data;
  let people;
  let eventsById;
  let editSelection;
  let personalEnabled = false;
  let personalLinks;
  let execution;
  let scheduleMode = "overview";
  let sharedPersonOpened = false;
  let openPerson;
  let returnPoint;
  const personalDialog = find("personal-guide");

  function editAt(parent, label, target, caption = "編輯") {
    if (!editSelection) return;
    const edit = element("button", "staff-edit-button", caption);
    edit.type = "button";
    edit.setAttribute("aria-label", "編輯" + label);
    edit.title = "編輯" + label;
    edit.onclick = (event) => {
      event.preventDefault();
      editSelection(target);
    };
    parent.append(edit);
  }

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function link(hash, text, className) {
    const anchor = element("a", className, text);
    anchor.href = "#" + hash;
    return anchor;
  }

  function list(items, ordered = false) {
    const node = element(ordered ? "ol" : "ul", "work-list");
    items.forEach((item) => node.append(element("li", "", item)));
    return node;
  }

  function fold(label, id) {
    const detail = element("details", "reference");
    if (id) detail.id = id;
    detail.append(element("summary", "", label));
    return detail;
  }

  function paragraph(target, text, className) {
    if (text) target.append(element("p", className, text));
  }

  function personName(id) {
    return people.get(id) || "待公布";
  }

  function personNode(id) {
    const name = personName(id);
    if (!personalEnabled || !people.has(id)) return document.createTextNode(name);
    const button = element("button", "person-name", name);
    button.type = "button";
    button.dataset.personId = id;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-label", "查看" + name + "的個人工作安排");
    return button;
  }

  function personParagraph(target, prefix, id, suffix = "", className) {
    const line = element("p", className, prefix);
    line.append(personNode(id), document.createTextNode(suffix));
    target.append(line);
  }

  function getEvents() {
    return (data.schedule || []).flatMap((day) => day.events);
  }

  function overviewTitle(event) {
    // Legacy published versions can still inherit the current short labels.
    const baseline = weddingData.schedule.flatMap(({ events }) => events).find(({ id }) => id === event.id);
    return event.overviewTitle ||
      (event.overviewTitle === undefined && baseline?.title === event.title && staffOverview[event.id]?.overviewTitle) ||
      event.title;
  }

  function timeNumber(value) {
    const parts = String(value).match(/(\d{1,2}):(\d{2})/);
    return parts ? Number(parts[1]) * 60 + Number(parts[2]) : null;
  }

  function eventLabel(title, status) {
    if (status === "tentative" && !/^(預計|暫定)/.test(title)) return "預計" + title;
    if (status === "pending" && !title.includes("待公布")) return title + "（待公布）";
    return title;
  }

  function timeRows(events, section) {
    const rows = element("dl", "time-rows");
    events.forEach(({ id, scheduleId, time, title, status, detail, previewIndex }) => {
      const row = element("div", "time-row");
      if (id) row.id = "event-" + id;
      const description = element("dd", "", eventLabel(title, status));
      paragraph(description, detail, "muted");
      const linked = eventsById.get(scheduleId);
      const displayedTime = linked?.time || time;
      const target = id ? { area: "event", id } : section && { area: section, index: previewIndex };
      const clock = element("dt", "clock", editSelection && target ? "" : displayedTime);
      if (target && editSelection) {
        editAt(clock, title + "時間", { ...(linked ? { area: "event", id: linked.id } : target), field: "time" }, displayedTime);
        editAt(description, title, id ? { ...target, field: "overviewTitle", overviewLabel: title } : { ...target, field: "label" });
      }
      row.append(clock, description);
      rows.append(row);
    });
    return rows;
  }

  function renderSchedule() {
    const content = [];
    (data.schedule || []).forEach((day) => {
      const visible = day.events.filter((event) =>
        !event.timeOnly && !(event.overviewHidden ?? staffOverview[event.id]?.overviewHidden ?? (day.id === "day-before"))
      );
      if (!visible.length) return;
      const dayBlock = element("div", "timeline-day");
      if (day.id !== today) dayBlock.append(element("h3", "", day.date));
      const groups = [[], [], []];
      let phase = 0;
      visible.forEach((event) => {
        const time = timeNumber(event.time);
        if (time !== null) phase = time < 780 ? 0 : time < 960 ? 1 : 2;
        groups[phase].push({ ...event, title: overviewTitle(event) });
      });
      const phases = element("div", "overview-grid");
      ["上午準備", "婚禮及活動", "撤場及婚宴"].forEach((title, index) => {
        if (!groups[index].length) return;
        const phase = element("section", "overview-phase");
        phase.append(element("h3", "", title), timeRows(groups[index]));
        phases.append(phase);
      });
      dayBlock.append(phases);
      content.push(dayBlock);
    });
    find("timeline-days").replaceChildren(...content);
    return content.length > 0;
  }

  function renderScheduleMode() {
    const detailed = personalEnabled && scheduleMode === "detail";
    find("timeline-days").hidden = detailed;
    const content = find("timeline-work");
    content.hidden = !detailed;
    document.querySelectorAll(".schedule-modes button").forEach((button) => {
      button.disabled = button.dataset.mode === "detail" && !personalEnabled;
      button.setAttribute("aria-pressed", String(button.dataset.mode === (detailed ? "detail" : "overview")));
    });
    if (!detailed) return;
    content.replaceChildren();
    for (const group of execution.groups) {
      const block = element("section", "execution-group");
      block.append(element("h3", "", group.label));
      const rows = element("ul", "execution-rows");
      const assignments = [];
      for (const row of group.rows) {
        const key = JSON.stringify([row.team?.id, row.scope, row.leaderId, row.memberIds, row.time, row.phase, row.place,
          Boolean(row.coordinating), Boolean(row.handoff)]);
        if (assignments.at(-1)?.key === key) assignments.at(-1).tasks.push(row);
        else assignments.push({ key, tasks: [row] });
      }
      for (const { tasks } of assignments) {
        const [row] = tasks;
        const li = element("li", "execution-row");
        const responsibility = element("div", "execution-responsibility");
        const name = row.team?.name || row.scope;
        if (name) responsibility.append(element("strong", "", name));
        const assigned = [...new Set(row.memberIds || [])].filter((id) => id !== row.leaderId);
        if (row.leaderId) {
          personParagraph(responsibility, row.coordinating ? "統籌 " : row.handoff ? "交接 " : "負責人 ", row.leaderId, "", "muted");
        }
        if (assigned.length) {
          const names = element("p", "muted", "工作人員 ");
          appendPeople(names, assigned);
          responsibility.append(names);
        }
        if (!row.leaderId && !assigned.length && row.team?.leaderId) {
          personParagraph(responsibility, "組別負責人 ", row.team.leaderId, "", "muted");
        }
        const task = element("div", "execution-task");
        paragraph(task, [row.time, row.phase, row.place].filter(Boolean).join(" · "), "muted");
        if (tasks.length === 1) {
          paragraph(task, row.text);
          if (row.target) editAt(task, "詳細工作", row.target);
        } else {
          const items = element("ul", "execution-items");
          for (const { text, target } of tasks) {
            const item = element("li", "", text);
            if (target) editAt(item, "詳細工作", target);
            items.append(item);
          }
          task.append(items);
        }
        li.append(responsibility, task);
        rows.append(li);
      }
      block.append(rows);
      content.append(block);
    }
    if (!content.childElementCount) paragraph(content, "目前沒有可顯示的詳細分工。", "muted");
  }

  document.querySelector(".schedule-modes").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (!button || !execution) return;
    scheduleMode = button.dataset.mode;
    renderScheduleMode();
  });

  function collectGuides() {
    const leaders = data.management || [];
    const guides = new Map();
    const usherLead = leaders.find(({ role }) => role.includes("招待組負責人"));
    const coordinators = leaders.filter((entry) => entry !== usherLead);
    if (coordinators.length || data.cleanup) {
      guides.set("operations", {
        id: "operations", title: "現場統籌與撤場", teams: [], managers: coordinators,
        indexVisible: Boolean(coordinators.length || data.cleanup?.areas.length)
      });
    }
    for (const team of data.teams || []) {
      const definition = groupDefinitions.find((group) => group.teams.includes(team.id));
      const key = definition?.id || team.id;
      if (!guides.has(key)) {
        guides.set(key, { id: key, title: definition?.title || team.name, teams: [] });
      }
      guides.get(key).teams.push(team);
    }
    function ensureGuide(id, title) {
      if (!guides.has(id)) guides.set(id, { id, title, teams: [] });
      return guides.get(id);
    }
    if (data.venues && !guides.has("chairs-stage")) ensureGuide("chairs-stage", "講台及場地布置");
    if (data.ceremony) ensureGuide("av", "影音及直播組");
    if (data.photoGroups) ensureGuide("photography", "攝影及大合照");
    if (usherLead) {
      const group = ensureGuide("ushers", "招待組");
      group.manager = usherLead;
      group.leader = usherLead.personId;
    }
    return [...guides.values()];
  }

  function roleNames(ids) {
    return ids.length ? ids.map(personName).join("、") : "待公布";
  }

  function appendPeople(parent, ids) {
    if (!ids.length) parent.append("待公布");
    ids.forEach((id, index) => {
      if (index) parent.append("、");
      parent.append(personNode(id));
    });
  }

  function appendRoles(parent, roles) {
    if (!roles.length) {
      parent.append(document.createTextNode("待公布"));
      return;
    }
    const tags = element("span", "roster-roles");
    roles.forEach(([label, ids]) => {
      const tag = element("span", "roster-role");
      tag.append(element("span", "roster-caption", label), document.createTextNode(" "));
      appendPeople(tag, ids);
      tags.append(tag);
    });
    parent.append(tags);
  }

  function indexEntry(parent, team, label, roles) {
    const entry = element("p", "index-entry");
    entry.dataset.teamId = team.id;
    if (label) entry.append(element("span", "roster-label", label));
    appendRoles(entry, roles);
    editAt(entry, team.name + "人員", { area: "team", id: team.id, field: "memberIds" }, "編輯人員");
    parent.append(entry);
  }

  function renderIndex(guides) {
    const rows = [];
    guides.forEach((guide) => {
      const teams = guide.teams.filter((team) => !team.indexHidden);
      if (!teams.length && !guide.indexVisible) return;
      const row = element("div", "index-row");
      const title = element("dt");
      title.append(element("h3", "", guide.title));
      if (guide.leader) personParagraph(title, "總負責人 ", guide.leader, "", "index-lead");
      const action = link("guide-" + guide.id, "查看指南", "index-link");
      action.setAttribute("aria-label", "查看" + guide.title + "指南");
      title.append(action);
      const names = element("dd");
      teams.forEach((team) => {
        const label = teams.length > 1 || team.name !== guide.title ? team.name : "";
        const distribution = staffRoster.distribution(team, people);
        if (distribution) {
          const otherRoles = staffRoster.teamRoles(team, distribution.unassigned);
          indexEntry(names, team, label, [...distribution.roles, ...otherRoles]);
        } else {
          indexEntry(names, team, label, staffRoster.teamRoles(team));
        }
      });
      if (guide.managers?.length) {
        guide.managers.forEach(({ role, personId }) => personParagraph(names, role + " ", personId));
      } else if (guide.indexVisible && data.cleanup) {
        data.cleanup.areas.forEach(({ name, leaderId }) => {
          if (leaderId) personParagraph(names, name + " ", leaderId);
        });
      }
      row.append(title, names);
      rows.push(row);
    });
    find("team-index").replaceChildren(...rows);
    return rows.length > 0;
  }

  function periodTime(label) {
    const time = timeNumber(label);
    if (time !== null) return time;
    if (/撤場|大合照後/.test(label)) return 970;
    if (/節目結束後|婚禮後|後續/.test(label)) return 925;
    if (/婚禮期間|婚禮演講|全體唱詩/.test(label)) return 870;
    if (/入場|活動期間/.test(label)) return 810;
    if (/上午/.test(label)) return 570;
    if (/婚禮開始前/.test(label)) return 860;
    return null;
  }

  function renderWork(parent, team, { showTitle, omit = [], showStorage = true } = {}) {
    const work = element("div", "team-work");
    work.dataset.teamId = team.id;
    if (showTitle || editSelection) {
      const title = element("h4", "", showTitle ? team.name : "");
      editAt(title, team.name, { area: "team", id: team.id, field: "name" }, "編輯組別");
      work.append(title);
    }
    const distribution = staffRoster.distribution(team, people);
    const roles = staffRoster.teamRoles(team, distribution?.unassigned);
    if (roles.length || !distribution) {
      const roster = element("p", "roster");
      appendRoles(roster, roles);
      editAt(roster, team.name + "人員", { area: "team", id: team.id, field: "memberIds" }, "編輯人員");
      work.append(roster);
    }
    paragraph(work, team.deadline, "deadline");
    const periods = team.periods.map((period, periodIndex) => {
      const { label, scheduleId, items } = period;
      const time = eventsById.get(scheduleId)?.time;
      return {
        label: time ? time + "　" + label : label,
        items: items.flatMap((item, itemIndex) => {
          const text = staffExecution.text(item);
          if (!text || typeof item === "string" && omit.includes(text)) return [];
          const assignment = distribution?.items.get(text);
          const row = execution.rowsFor(team, period, item, periodIndex, itemIndex);
          const linked = row.scheduleId !== scheduleId ? eventsById.get(row.scheduleId) : null;
          return [{
            ...row, place: typeof item === "string" ? "" : row.place,
            text: assignment ? assignment.role + "：" + roleNames(assignment.ids) : text,
            timing: [row.work.time || linked?.time, row.work.phase].filter(Boolean).join(" · "),
            assignment,
          }];
        }),
        rank: time ? timeNumber(time) : periodTime(label)
      };
    });
    for (const row of execution.standalone.filter((item) => item.team?.id === team.id)) {
      const event = eventsById.get(row.scheduleId);
      const time = row.time || event.time;
      const next = periods.findIndex(({ rank }) => rank !== null && rank > timeNumber(time));
      periods.splice(next < 0 ? periods.length : next, 0, {
        label: [time, row.phase || event.title].filter(Boolean).join("　"),
        rank: timeNumber(time), items: [row]
      });
    }
    getEvents().filter((event) => !event.timeOnly &&
      (event.guideTeamIds ?? staffOverview[event.id]?.guideTeamIds ?? []).includes(team.id)
    ).forEach((event) => {
      const entry = {
        label: event.time + "　" + eventLabel(event.title, event.status),
        items: [
          { text: event.summary, target: { area: "event", id: event.id, field: "summary" } },
          ...(event.details || []).map((text, index) => ({
            text, target: { area: "event", id: event.id, field: "details", index }
          })),
          { text: event.note, target: { area: "event", id: event.id, field: "note" } }
        ].filter(({ text }) => text),
        rank: timeNumber(event.time)
      };
      const next = entry.rank === null ? -1 : periods.findIndex((period) => period.rank !== null && period.rank > entry.rank);
      periods.splice(next < 0 ? periods.length : next, 0, entry);
    });
    periods.forEach(({ label, items }) => {
      if (!items.length) return;
      const block = element("div", "work-period");
      const tasks = list(items.map(({ text }) => text));
      items.forEach((row, index) => {
        const { target, assignment } = row;
        const task = tasks.children[index];
        if (assignment && personalEnabled) {
          task.replaceChildren(assignment.role + "：");
          appendPeople(task, assignment.ids);
        }
        if (row.timing || row.place || staffExecution.people(row).length) {
          const context = element("span", "muted execution-context",
            [row.timing, row.place].filter(Boolean).join(" · "));
          if (staffExecution.people(row).length) {
            if (context.textContent) context.append(" · ");
            appendPeople(context, staffExecution.people(row));
          }
          task.append(context);
        }
        editAt(task, "工作內容", target);
      });
      block.append(element("h5", "", label), tasks);
      work.append(block);
    });
    if (team.notes?.length) {
      if (team.notes.length < 3) work.append(list(team.notes));
      else {
        const notes = fold("補充注意事項");
        notes.append(list(team.notes));
        work.append(notes);
      }
    }
    if (showStorage && (team.deadline || team.periods.some(({ label, items }) => /撤場|撤收|復原|拆卸/.test(label + items.map(staffExecution.text).join(""))))) {
      paragraph(work, storageNote(), "muted");
    }
    parent.append(work);
  }

  function storageNote() {
    return data.cleanup?.storageNote || data.cleanup?.logistics.find(({ title }) => title === "集會所暫存與隔天取回")?.text;
  }

  function sharedUsherDuties(teams) {
    const areas = teams.filter(({ id }) => ["hall-a-ushers", "hall-b-ushers", "downstairs-ushers"].includes(id));
    if (areas.length < 2) return [];
    const duties = areas.map(({ periods }) => periods.flatMap(({ items }) => items.filter((item) => typeof item === "string")));
    return [...new Set(duties[0])].filter((item) => duties.slice(1).every((area) => area.includes(item)));
  }

  function renderManagers(body, guide) {
    if (guide.manager) {
      const details = fold("組別負責人工作");
      editAt(details, "組別負責人工作", { area: "management" });
      details.append(list(guide.manager.duties));
      paragraph(details, guide.manager.note, "muted");
      body.append(details);
    }
    guide.managers?.forEach((manager) => {
      const block = element("section", "team-work");
      const heading = element("h4", "", manager.role + "｜");
      heading.append(personNode(manager.personId));
      block.append(heading, list(manager.duties));
      editAt(block.firstElementChild, manager.role, { area: "management" });
      paragraph(block, manager.note, "muted");
      body.append(block);
    });
  }

  function renderGuide(guide) {
    const detail = element("details", "work-guide");
    detail.id = "guide-" + guide.id;
    detail.setAttribute("name", "staff-guides");
    const title = element("summary", "", guide.title);
    const body = element("div", "guide-body");
    if (guide.leader) personParagraph(body, "負責人 ", guide.leader, "", "roster");
    const common = guide.id === "ushers" ? sharedUsherDuties(guide.teams) : [];
    if (common.length) {
      const heading = element("h4", "", "各區招待共通工作");
      editAt(heading, "各區招待工作", { area: "ushers" });
      body.append(heading, list(common));
    }
    renderManagers(body, guide);
    guide.teams.forEach((team) => renderWork(body, team, {
      showTitle: guide.title !== team.name, omit: common,
      showStorage: guide.teams.length === 1
    }));
    if (guide.teams.length > 1 && guide.teams.some(({ periods }) => periods.some(({ items }) => items.some((item) => /撤場|撤收|復原/.test(staffExecution.text(item)))))) {
      paragraph(body, storageNote(), "muted");
    }
    if (guide.id === "operations" && data.cleanup) renderCleanup(body);
    if (guide.id === "ushers" && data.seating) addSeating(body, "ushers");
    if (guide.id === "chairs-stage" && data.seating) {
      addSeating(body, "stage");
      renderVenues(body);
    }
    if (guide.id === "av" && data.ceremony) renderProgram(body);
    if (guide.id === "photography" && data.photoGroups) renderPhotos(body);
    if (guide.id === "ushers" || guide.teams.length) renderHandoffs(body, guide);
    if (!data.sections?.allocation) body.append(link("teams", "返回工作分配", "back-to-index"));
    detail.append(title, body);
    return detail;
  }

  function renderHandoffs(body, guide) {
    const memberIds = new Set(guide.teams.flatMap(({ memberIds, supportIds }) => [...memberIds, ...(supportIds || [])]));
    const unique = (data.assignments || []).filter(({ personId, from }) =>
      memberIds.has(personId) && (guide.id !== "ushers" || from.includes("招待"))
    );
    if (!unique.length) return;
    const detail = fold("兼任工作交接");
    editAt(detail, "兼任工作交接", { area: "assignments" });
    unique.forEach((item) => personParagraph(detail, "", item.personId,
      "｜" + item.trigger + "，從" + item.from + "轉至" + item.to + "。" + item.returnTo + "。"));
    body.append(detail);
  }

  function addSeating(body, context) {
    const seating = fold(context === "ushers" ? "座位及大合照配置圖" : "講台及大合照配置圖",
      editSelection ? context + "-seating-editor" : undefined);
    const plan = element("div", "floor-plan-wrap");
    plan.id = context + "-floor-plan";
    paragraph(seating, data.seating.orientation, "muted");
    editAt(seating, "座位及配置說明", { area: "seating" });
    if (context === "ushers") seating.append(list([data.seating.reserved, data.seating.family, data.seating.general]));
    paragraph(seating, data.seating.removal, "muted");
    const toggles = element("div", "diagram-tabs");
    toggles.setAttribute("role", "group");
    toggles.setAttribute("aria-label", "聚會所配置切換");
    for (const [mode, title] of [["ceremony", "婚禮期間"], ["photo", "大合照期間"]]) {
      const button = element("button", "diagram-tab", title);
      button.type = "button";
      button.dataset.diagram = mode;
      button.setAttribute("aria-pressed", String(mode === "ceremony"));
      button.onclick = () => {
        for (const item of toggles.children) item.setAttribute("aria-pressed", String(item === button));
        renderFloorPlan(plan, mode);
      };
      toggles.append(button);
    }
    seating.append(toggles, plan);
    const legend = element("ul", "legend");
    for (const [kind, title] of [["reserved", "聾人保留座位"], ["family", "親屬優先座位"], ["general", "一般賓客座位"], ["removal", "大合照清空範圍"]]) {
      const item = element("li");
      item.append(element("i", "legend-box " + kind), document.createTextNode(title));
      legend.append(item);
    }
    seating.append(legend);
    seating.addEventListener("toggle", () => {
      if (seating.open && !plan.hasChildNodes()) renderFloorPlan(plan, "ceremony");
    });
    body.append(seating);
  }

  function renderVenues(body) {
    const venues = fold("場地、地址及動線", "venues");
    editAt(venues, "場地說明", { area: "venues" });
    const info = data.weddingInfo;
    paragraph(venues, info.ceremonyVenue + "｜" + info.ceremonyAddress);
    const map = element("a", "", "開啟場地地圖");
    map.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(info.ceremonyVenue + " " + info.ceremonyAddress);
    map.target = "_blank";
    map.rel = "noopener noreferrer";
    venues.append(map);
    data.venues.forEach((venue) => {
      venues.append(element("h4", "", venue.name));
      paragraph(venues, [venue.purpose, venue.capacity].filter(Boolean).join("・"), "muted");
      venues.append(list(venue.items));
      paragraph(venues, venue.note);
    });
    body.append(venues);
  }

  function renderProgram(body) {
    const program = fold("婚禮節目、直播機位及影音提示", "program");
    const { start, targetEnd, startEventId, endEventId, items } = data.ceremony;
    const linkedEnd = eventsById.get(endEventId)?.time;
    paragraph(program, (eventsById.get(startEventId)?.time || start) + " 開始｜" + (linkedEnd ? linkedEnd + "（目標時間）" : targetEnd));
    editAt(program.lastElementChild, "婚禮節目及時間", { area: "ceremony" });
    if (data.avInfo?.operatorId) personParagraph(program, "焦點視訊操作 ", data.avInfo.operatorId);
    const cameras = element("dl", "reference-rows");
    data.cameraPositions.forEach((camera, index) => {
      const code = camera.label || (/^[a-z0-9]{1,3}$/i.test(camera.id) ? camera.id : String(index + 1));
      const row = element("div");
      const heading = element("dt", "", "機位 " + code + "｜");
      heading.append(camera.operatorId ? personNode(camera.operatorId) : document.createTextNode(camera.operator));
      row.append(heading, element("dd", "", camera.device + "・" + camera.place + "。 " + camera.work));
      editAt(row.firstElementChild, "直播機位 " + code, { area: "camera", id: camera.id });
      cameras.append(row);
    });
    if (data.cameraPositions.length) program.append(element("h4", "", "直播機位"), cameras);
    if (items.length) {
      program.append(element("h4", "", "婚禮節目順序"), list(items.map((item) =>
        eventLabel(item.title, item.status) + (item.detail ? "｜" + item.detail : "")
      ), true));
    }
    if (data.avCues.length) {
      const table = element("table", "cue-table");
      table.append(element("caption", "", "影音操作提示"));
      editAt(table.firstElementChild, "影音操作提示", { area: "avCues" });
      const head = element("thead");
      const heading = element("tr");
      ["婚禮環節", "畫面", "音訊及其他操作"].forEach((text) => {
        const th = element("th", "", text);
        th.scope = "col";
        heading.append(th);
      });
      head.append(heading);
      const rows = element("tbody");
      data.avCues.forEach(({ moment, video, audio }) => {
        const row = element("tr");
        const momentCell = element("th", "", moment);
        momentCell.scope = "row";
        row.append(momentCell, element("td", "", video), element("td", "", audio));
        rows.append(row);
      });
      table.append(head, rows);
      program.append(table);
    }
    paragraph(body, data.avInfo?.note, "muted");
    body.append(program);
    const tests = fold("影音測試及設備說明");
    editAt(tests, "影音測試及設備說明", { area: "avChecklist" });
    if (data.avChecklist.length) tests.append(list(data.avChecklist));
    if (data.equipment.length) tests.append(element("h4", "", "設備配置"), list(data.equipment));
    if (data.avChecklist.length || data.equipment.length) body.append(tests);
  }

  function renderPhotos(body) {
    const { location, photographerId, hostId, host, message, groups, steps, coordination } = data.photoGroups;
    const photos = element("section", "team-work");
    photos.id = "photos";
    photos.append(element("h4", "", "正式大合照"));
    editAt(photos.firstElementChild, "大合照安排", { area: "photoGroups" });
    const roster = element("p", "roster", location);
    if (photographerId) roster.append(location ? "｜攝影 " : "攝影 ", personNode(photographerId));
    roster.append(location || photographerId ? "｜主持 " : "主持 ", hostId ? personNode(hostId) : host || "待公布");
    photos.append(roster);
    paragraph(photos, coordination);
    if (steps.length) photos.append(list(steps, true));
    if (groups?.length) {
      photos.append(element("h5", "", "合照分組順序"), list(groups.map(({ name, note }) =>
        note ? name + "｜" + note : name
      ), true));
    } else paragraph(photos, message || "合照分組及順序待公布。", "muted");
    body.append(photos);
    if (data.photoServices?.length) {
      const services = fold("攝影及背板服務補充說明");
      editAt(services, "攝影及背板服務", { area: "photoServices" });
      data.photoServices.forEach((service) => {
        services.append(element("h4", "", service.title));
        service.duties.forEach(({ personId, work }) => personParagraph(services, "", personId, "｜" + work));
        service.notes.forEach((note) => paragraph(services, note, "muted"));
      });
      body.append(services);
    }
  }

  function renderCleanup(body) {
    const cleanup = data.cleanup;
    paragraph(body, cleanup.summary);
    if (cleanup.keyTimes.length) body.append(timeRows(cleanup.keyTimes.map(({ label, ...time }, previewIndex) =>
      ({ ...time, title: label, previewIndex })), "cleanup"));
    paragraph(body, storageNote(), "muted");
    const checks = fold("各場地撤場檢查及物資去向", "cleanup");
    editAt(checks, "撤場與物資去向", { area: "cleanup" });
    cleanup.areas.forEach(({ name, leaderId, items, note }) => {
      const heading = element("h4", "", name);
      if (leaderId) heading.append("｜", personNode(leaderId));
      checks.append(heading, list(items));
      paragraph(checks, note, "muted");
    });
    cleanup.logistics.forEach(({ title, text, status }) => {
      checks.append(element("h4", "", eventLabel(title, status)));
      paragraph(checks, text);
    });
    body.append(checks);
  }

  function renderReception() {
    const parent = find("reception-content");
    parent.replaceChildren();
    if (!data.reception) return;
    const { venue, hall, times, advanceTeam, advanceTasks, groups, note } = data.reception;
    paragraph(parent, [venue, hall].filter(Boolean).join("｜"), "reception-location");
    editAt(parent.lastElementChild || parent, "婚宴安排", { area: "reception" });
    const publicTimes = times.flatMap(({ label, status, ...item }, previewIndex) =>
      !status || status === "confirmed" ? [{ ...item, title: label, status, previewIndex }] : []);
    if (publicTimes.length) {
      parent.append(timeRows(publicTimes, "reception"));
    }
    const arrival = eventsById.get("reception-arrival");
    if (arrival?.summary) paragraph(parent, arrival.time + "｜" + arrival.summary, "muted");
    if (advanceTasks.length || advanceTeam) {
      const advance = element("section", "team-work");
      advance.append(element("h3", "", "婚宴先遣"));
      editAt(advance.firstElementChild, "婚宴先遣", { area: "reception", field: "advanceTeam" });
      paragraph(advance, advanceTeam && "人員 " + advanceTeam, "roster");
      if (advanceTasks.length) advance.append(list(advanceTasks));
      parent.append(advance);
    }
    (groups || []).forEach((team) => {
      renderWork(parent, team, { showTitle: true, showStorage: false });
      parent.lastElementChild.id = "reception-team-" + team.id;
    });
    if (note && note !== "其他婚宴詳細流程及人員安排後續補充。") paragraph(parent, note, "muted");
  }

  function openGuideForHash(move = false) {
    const id = location.hash.slice(1);
    const target = find(id);
    if (!target) return;
    const guide = target.closest(".work-guide");
    if (!guide) return;
    for (const item of find("guide-list").children) item.open = item === guide;
    if (target.matches("details.reference")) target.open = true;
    if (move) {
      const focusTarget = (target.matches("details") && target.querySelector("summary")) || target;
      focusTarget.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start" });
    }
  }

  function mount(snapshot, published = false) {
    const open = find("guide-list").querySelector(".work-guide[open]")?.id;
    const references = source.preview ? [...document.querySelectorAll("details.reference[open][id]")].map(({ id }) => id) : [];
    data = snapshot;
    personalEnabled = published;
    people = new Map(data.people.map(({ id, name }) => [id, name]));
    eventsById = new Map(getEvents().map((event) => [event.id, event]));
    execution = staffExecution.collect(data, staffPersonalGuide);
    find("hero-couple").textContent = data.weddingInfo.couple;
    find("hero-title").textContent = data.weddingInfo.title;
    find("hero-date").textContent = data.weddingInfo.date + "・" + data.weddingInfo.weekday;
    const settings = data.sections || {};
    const guides = collectGuides();
    personalLinks = {
      guideByTeam: new Map([
        ...guides.flatMap((guide) => guide.teams.map(({ id }) => [id, "guide-" + guide.id])),
        ...(data.reception?.groups || []).map(({ id }) => [id, "reception-team-" + id])
      ]),
      guideByManager: new Map(guides.flatMap((guide) =>
        [guide.manager, ...(guide.managers || [])].filter(Boolean).map(({ role }) => [role, "guide-" + guide.id])
      )),
      execution
    };
    const hasSchedule = !settings.schedule && renderSchedule();
    renderScheduleMode();
    if (settings.schedule) find("timeline-days").replaceChildren();
    const hasIndex = renderIndex(guides);
    find("personal-guide-hint").hidden = !personalEnabled || !hasIndex;
    find("guide-list").replaceChildren(...guides.map(renderGuide));
    renderReception();
    const visibility = {
      schedule: !settings.schedule && (hasSchedule || execution.groups.length > 0),
      teams: !settings.allocation && hasIndex,
      guides: guides.length > 0,
      reception: !settings.reception && Boolean(data.reception)
    };
    sections.forEach((id) => {
      find(id).hidden = !visibility[id];
      document.querySelector(".site-nav a[href='#" + id + "']").hidden = !visibility[id];
    });
    if (open && find(open)) find(open).open = true;
    for (const id of references) if (find(id)) find(id).open = true;
    if (!source.preview) openGuideForHash(true);
    if (personalDialog.open) {
      if (!personalEnabled || !people.has(openPerson)) personalDialog.close();
      else showPerson(openPerson);
    } else if (personalEnabled && !source.preview && !sharedPersonOpened) {
      const id = new URLSearchParams(location.search).get("person");
      if (id && people.has(id)) {
        sharedPersonOpened = true;
        showPerson(id);
      }
    }
  }

  window.addEventListener("hashchange", () => openGuideForHash(true));
  find("guide-list").addEventListener("toggle", (event) => {
    const guide = event.target;
    if (!guide.matches(".work-guide[open]")) return;
    for (const item of find("guide-list").children) {
      if (item !== guide && item.open) item.open = false;
    }
  }, true);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button.person-name");
    if (button && personalEnabled) {
      returnPoint = { button, x: window.scrollX, y: window.scrollY };
      showPerson(button.dataset.personId);
      return;
    }
    const anchor = event.target.closest("a[href^='#']");
    if (anchor && personalDialog.contains(anchor)) {
      returnPoint = null;
      personalDialog.close();
    }
    if (source.preview && anchor) {
      event.preventDefault();
      navigatePreview(anchor.hash.slice(1));
      return;
    }
    if (anchor && anchor.hash === location.hash) openGuideForHash(true);
  });

  personalDialog.addEventListener("close", () => {
    if (personalDialog.open) return;
    if (returnPoint) {
      const { button, x, y } = returnPoint;
      const replacement = button.isConnected ? button : [...document.querySelectorAll(".person-name")]
        .find((candidate) => candidate.dataset.personId === openPerson && candidate.getClientRects().length);
      (replacement || find("refresh-published")).focus({ preventScroll: true });
      window.scrollTo(x, y);
    }
    openPerson = null;
    returnPoint = null;
  });

  function showPerson(id) {
    const guide = staffPersonalGuide.build(data, id, personalLinks);
    if (!guide) return;
    openPerson = id;
    const body = find("personal-guide-body");
    const scroll = personalDialog.open ? body.scrollTop : 0;
    const restoreDialogFocus = body.contains(document.activeElement);
    find("personal-guide-name").textContent = guide.name;
    find("share-personal-guide").hidden = source.preview;
    find("share-personal-guide").textContent = "複製連結";
    body.replaceChildren();
    if (guide.roles.length) {
      const roles = element("ul", "personal-roles");
      guide.roles.forEach(({ title, target, labels }) => {
        const item = element("li", "");
        item.append(element("strong", "", title), document.createTextNode("　" + labels.join("、")));
        if (target && find(target)) {
          const full = link(target, "查看完整組別指南");
          full.setAttribute("aria-label", "查看" + title + "完整指南");
          item.append(full);
        }
        roles.append(item);
      });
      body.append(element("h3", "", "組別與職責"), roles);
    }
    body.append(element("h3", "", "工作安排"));
    if (!guide.tasks.length) paragraph(body, "目前沒有已公布的個人或組別工作安排。", "muted");
    else {
      const rows = element("ol", "personal-timeline");
      let previous;
      let duties;
      for (const task of guide.tasks) {
        const group = task.order[0] + "|" + task.when;
        if (group !== previous) {
          const row = element("li", "");
          duties = element("ul", "personal-duties");
          row.append(element("h4", "", task.when), duties);
          rows.append(row);
          previous = group;
        }
        const duty = element("li", "");
        paragraph(duty, [task.scopes.map(({ title }) => title).join("、"), task.kind, task.place].filter(Boolean).join(" · "), "muted");
        paragraph(duty, task.text);
        duties.append(duty);
      }
      body.append(rows);
    }
    if (!personalDialog.open) personalDialog.showModal();
    else if (restoreDialogFocus) personalDialog.querySelector("form button").focus({ preventScroll: true });
    body.scrollTop = scroll;
  }

  find("share-personal-guide").addEventListener("click", async (event) => {
    if (!openPerson || source.preview) return;
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set("person", openPerson);
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(url.href);
      button.textContent = "已複製";
    } catch {
      const input = element("input", "personal-share-url");
      input.readOnly = true;
      input.value = url.href;
      input.setAttribute("aria-label", "個人工作指南連結");
      const body = find("personal-guide-body");
      body.querySelector(".personal-share-url")?.remove();
      body.prepend(input);
      button.textContent = "選取連結";
      input.select();
    }
  });

  function navigatePreview(id) {
    const target = find(id);
    if (!target || target.hidden) return;
    const guide = target.closest(".work-guide");
    if (guide) guide.open = true;
    if (target.matches("details.reference")) target.open = true;
    target.scrollIntoView({ block: "start" });
  }

  function chair(x, y, kind, label) {
    return `<g class="seat ${kind}" aria-label="${label}"><rect x="${x}" y="${y}" width="24" height="19" rx="4"></rect></g>`;
  }

  function renderFloorPlan(plan, mode) {
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

    plan.innerHTML = `<svg class="floor-plan" viewBox="0 0 534 430" role="img" aria-labelledby="${plan.id}-title" aria-describedby="${plan.id}-desc">
      <title id="${plan.id}-title">聚會所${isPhoto ? "大合照期間" : "婚禮期間"}配置示意</title>
      <desc id="${plan.id}-desc">${description}詢問處位於聚會所後方，提供資訊及接收禮物。</desc>
      <rect class="room" x="18" y="18" width="498" height="394" rx="18"></rect>
      <text class="orientation-label" x="267" y="40" text-anchor="middle">賓客面向講台</text>
      ${stageAndPhotoArea}
      <line class="aisle-line" x1="267" y1="${isPhoto ? 246 : 140}" x2="267" y2="371"></line><text class="aisle-label" x="267" y="350" text-anchor="middle">中央走道</text>
      ${rows.join("")}
      <rect class="desk" x="375" y="373" width="108" height="26" rx="6"></rect><text class="desk-label" x="429" y="391" text-anchor="middle">詢問處・禮物</text>
      <text class="wall-label" x="32" y="260" transform="rotate(-90 32 260)" text-anchor="middle">最靠左側牆壁</text>
    </svg>`;
    plan.append(element("p", "diagram-disclaimer", data.seating.disclaimer));
  }

  const status = document.querySelector("#published-status");
  const refresh = document.querySelector("#refresh-published");
  let cached;
  function showStatus(failure = "") {
    const published = cached ? "更新時間 " + new Date(cached.updatedAt).toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei", hour12: false
    }) : "備用資料更新 " + staffFallbackUpdatedOn;
    status.textContent = failure ? failure + "，顯示" + (cached ? "最近快取・" : "") + published : published;
  }
  if (source.preview) {
    find("main-content").hidden = true;
    status.textContent = "等待管理端預覽資料";
    source.previewData((snapshot, select) => {
      editSelection = select;
      document.body.classList.toggle("staff-editing", Boolean(select));
      mount(snapshot, true);
      find("main-content").hidden = false;
      status.textContent = select ? "點選時間或編輯按鈕修改內容" : "草稿預覽";
    }, navigatePreview);
    return;
  }
  cached = source.readCache();
  try {
    mount(cached?.data || weddingData, Boolean(cached));
  } catch (error) {
    if (!cached) throw error;
    cached = null;
    mount(weddingData);
  }
  showStatus();
  if (source.enabled) {
    let checkedAt = 0;
    let refreshing = false;
    async function refreshData() {
      if (refreshing) return;
      refreshing = true;
      refresh.disabled = true;
      const previous = cached;
      try {
        const latest = await source.getLatest();
        if (cached && latest.version < cached.version) throw new Error("版本早於快取");
        if (!cached || cached.version !== latest.version) mount(latest.data, true);
        cached = latest;
        source.remember(latest);
        showStatus();
      } catch (error) {
        const fallback = previous?.data || weddingData;
        if (data !== fallback) mount(fallback, Boolean(previous));
        showStatus(error?.code === "PUBLISHED_UNAVAILABLE" ? error.message : "無法取得最新資料");
      } finally {
        checkedAt = Date.now();
        refresh.disabled = false;
        refreshing = false;
      }
    }
    function refreshWhenVisible() {
      if (!document.hidden && Date.now() - checkedAt > 60000) refreshData();
    }
    refresh.hidden = false;
    refresh.addEventListener("click", refreshData);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", refreshData);
    setInterval(refreshWhenVisible, 120000);
    refreshData();
  }
})();
