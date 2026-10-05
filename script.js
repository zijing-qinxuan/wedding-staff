const staffMembers = [
  {
    id: "wang-xiaoming",
    name: "王小明",
    group: "招待組",
    role: "入口引導",
    table: "18",
    tasks: [
      {
        time: "13:20",
        place: "竹東王國聚會所",
        title: "工作人員集合",
        description: "到場後與招待組集合，確認婚禮入場工作。",
        with: "招待組",
        next: "13:30 開始協助賓客入場"
      },
      {
        time: "13:30–14:30",
        place: "聚會所入口",
        title: "婚禮賓客入場",
        description: "協助賓客進場，並留意需要協助的長輩。",
        with: "招待組",
        next: "婚禮開始後依安排待命"
      },
      {
        time: "16:30",
        place: "晶宴會館・星辰劇場",
        title: "婚宴工作人員集合",
        description: "確認婚宴入口位置與桌位引導安排。",
        with: "招待組",
        next: "17:00 開始婚宴接待"
      },
      {
        time: "17:00–17:50",
        place: "星辰劇場入口",
        title: "婚宴賓客引導",
        description: "協助賓客確認桌號並指引入場方向。",
        with: "招待組",
        next: "工作完成後準備入席"
      }
    ]
  },
  {
    id: "lin-xiaohua",
    name: "林小華",
    group: "婚宴組",
    role: "桌位協助",
    table: "20",
    tasks: [
      {
        time: "16:20",
        place: "晶宴會館・星辰劇場",
        title: "婚宴工作人員集合",
        description: "確認桌位名單及工作區域。",
        with: "婚宴組",
        next: "17:00 開始協助賓客入場"
      },
      {
        time: "17:00–18:00",
        place: "婚宴入口",
        title: "桌位查詢",
        description: "協助賓客確認桌號，並引導至正確區域。",
        with: "招待組",
        next: "開席後依安排返回座位"
      }
    ]
  },
  {
    id: "chen-daming",
    name: "陳大明",
    group: "招待組",
    role: "電梯口引導",
    table: "18",
    tasks: []
  },
  {
    id: "zhang-xiaomei",
    name: "張小美",
    group: "招待組",
    role: "長輩協助",
    table: "18",
    tasks: []
  },
  {
    id: "lin-zhihao",
    name: "林志豪",
    group: "招待組",
    role: "現場機動",
    table: "18",
    tasks: []
  },
  {
    id: "chen-yijun",
    name: "陳怡君",
    group: "婚宴組",
    role: "入口名單確認",
    table: "20",
    tasks: []
  },
  {
    id: "huang-junjie",
    name: "黃俊傑",
    group: "婚宴組",
    role: "場內引導",
    table: "20",
    tasks: []
  }
];

// People are maintained once in staffMembers; teams only reference stable ids.
const teams = [
  {
    id: "welcome",
    label: "WELCOME TEAM",
    name: "招待組",
    members: ["wang-xiaoming", "chen-daming", "zhang-xiaomei", "lin-zhihao"],
    schedule: [
      { time: "13:20", title: "婚禮工作人員集合", place: "竹東王國聚會所" },
      { time: "16:30", title: "婚宴工作人員集合", place: "晶宴會館・星辰劇場" },
      { time: "17:00", title: "開始婚宴接待" }
    ]
  },
  {
    id: "banquet",
    label: "BANQUET TEAM",
    name: "婚宴組",
    members: ["lin-xiaohua", "chen-yijun", "huang-junjie"],
    schedule: [
      { time: "16:20", title: "婚宴工作人員集合", place: "晶宴會館・星辰劇場" },
      { time: "16:40", title: "確認桌位與工作區域" },
      { time: "17:00", title: "開始協助賓客入場" }
    ]
  }
];

const staffById = new Map(staffMembers.map((member) => [member.id, member]));

const taskModal = document.querySelector("#task-modal");
const taskModalPanel = taskModal.querySelector(".task-modal-panel");
const openTaskModalButton = document.querySelector("#open-task-modal");
const openTeamsModalButton = document.querySelector("#open-teams-modal");
const closeTaskModalButton = document.querySelector("#close-task-modal");
const taskSearchView = document.querySelector("#task-search-view");
const taskTeamsView = document.querySelector("#task-teams-view");
const taskTeamsTitle = document.querySelector("#task-teams-title");
const teamCardList = document.querySelector("#team-card-list");
const taskScheduleView = document.querySelector("#task-schedule-view");
const backToSearchButton = document.querySelector("#back-to-task-search");
const taskBackLabel = document.querySelector("#task-back-label");
const taskSearchInput = document.querySelector("#task-name-search");
const taskSearchResults = document.querySelector("#task-search-results");
const taskScheduleName = document.querySelector("#task-schedule-name");
const taskScheduleMeta = document.querySelector("#task-schedule-meta");
const personalTaskList = document.querySelector("#personal-task-list");
const personalTaskEmpty = document.querySelector("#personal-task-empty");
const personalTableTitle = document.querySelector("#personal-table-title");
const personalTableDescription = document.querySelector(
  "#personal-table-description"
);

let pageScrollPosition = 0;
let closeTimer;
let isClosing = false;
let currentView = "search";
let previousView = "search";
let previousScrollTop = 0;
let previousMemberButton = null;
let modalOpener = openTaskModalButton;

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}

function createTaskNote(label, value) {
  const note = document.createElement("div");
  const term = createElement("dt", "personal-task-note-label", label);
  const description = createElement(
    "dd",
    "personal-task-note-value",
    value
  );

  note.append(term, description);

  return note;
}

function renderTeams() {
  teamCardList.replaceChildren();

  teams.forEach((team) => {
    const members = team.members.map((id) => staffById.get(id));
    const card = createElement("section", "team-card");
    const header = createElement("header", "team-card-header");
    const label = createElement("p", "task-modal-label", team.label);
    const title = createElement("h3", "team-card-title", team.name);
    const count = createElement("p", "team-card-count", `${members.length} 人`);
    const memberList = createElement("ul", "team-member-list");

    title.id = `team-${team.id}-title`;
    card.setAttribute("aria-labelledby", title.id);
    header.append(label, title, count);

    members.forEach((member) => {
      const item = document.createElement("li");
      const button = createElement("button", "team-member-button");
      const text = document.createElement("span");
      const name = createElement("span", "team-member-name", member.name);
      const role = createElement("span", "team-member-role", member.role);
      const arrow = createElement("span", "task-result-arrow", "→");

      button.type = "button";
      button.setAttribute("aria-label", `${member.name}，${member.role}，查看個人工作安排`);
      arrow.setAttribute("aria-hidden", "true");
      button.addEventListener("click", () => showPersonalSchedule(member, button));
      text.append(name, role);
      button.append(text, arrow);
      item.append(button);
      memberList.append(item);
    });

    const commonSchedule = createElement("section", "team-common-schedule");
    const scheduleLabel = createElement("p", "task-modal-label", "COMMON SCHEDULE");
    const scheduleTitle = createElement("h4", "team-common-title", "共同安排");
    const scheduleList = createElement("ol", "team-schedule-list");

    scheduleTitle.id = `team-${team.id}-schedule-title`;
    commonSchedule.setAttribute("aria-labelledby", scheduleTitle.id);
    team.schedule.forEach((event) => {
      const item = createElement("li", "team-schedule-item");
      const time = createElement("span", "team-schedule-time", event.time);
      const text = document.createElement("div");
      text.append(createElement("p", "team-schedule-event", event.title));
      if (event.place) {
        text.append(createElement("p", "team-schedule-place", event.place));
      }
      item.append(time, text);
      scheduleList.append(item);
    });

    commonSchedule.append(scheduleLabel, scheduleTitle, scheduleList);
    card.append(header, memberList, commonSchedule);
    teamCardList.append(card);
  });
}

function createPersonalTask(task) {
  const taskItem = document.createElement("li");
  const heading = createElement("div", "personal-task-heading");
  const time = createElement("span", "personal-task-time", task.time);
  const titleGroup = createElement("div", "personal-task-title-group");
  const title = createElement("h4", "personal-task-title", task.title);
  const place = createElement("p", "personal-task-place", task.place);
  const description = createElement(
    "p",
    "personal-task-description",
    task.description
  );
  const notes = createElement("dl", "personal-task-notes");

  taskItem.className = "personal-task-item";

  titleGroup.append(title, place);
  heading.append(time, titleGroup);
  notes.append(
    createTaskNote("配合", task.with),
    createTaskNote("下一步", task.next)
  );
  taskItem.append(heading, description, notes);

  return taskItem;
}

function renderPersonalSchedule(member) {
  taskScheduleName.textContent = member.name;
  taskScheduleMeta.textContent = `${member.group} · ${member.role}`;
  personalTaskList.replaceChildren(
    ...member.tasks.map((task) => createPersonalTask(task))
  );
  personalTaskList.hidden = member.tasks.length === 0;
  personalTaskEmpty.hidden = member.tasks.length !== 0;
  personalTableTitle.textContent = `第 ${member.table} 桌`;
  personalTableDescription.textContent =
    `工作完成後，請前往第 ${member.table} 桌入席。`;
}

function showPersonalSchedule(member, sourceButton) {
  previousView = currentView;
  previousScrollTop = taskModalPanel.scrollTop;
  previousMemberButton = sourceButton;
  currentView = "schedule";
  renderPersonalSchedule(member);

  taskSearchView.hidden = true;
  taskTeamsView.hidden = true;
  taskScheduleView.hidden = false;
  backToSearchButton.hidden = false;
  taskBackLabel.textContent = previousView === "teams" ? "返回工作分組" : "返回搜尋";
  taskModalPanel.classList.add("has-schedule");
  taskModalPanel.classList.remove("has-teams");
  taskModal.setAttribute("aria-labelledby", "task-schedule-name");
  taskModal.setAttribute("aria-describedby", "task-schedule-meta");
  taskModalPanel.scrollTop = 0;

  requestAnimationFrame(() => {
    if (!isClosing && !taskModal.hidden && !taskScheduleView.hidden) {
      backToSearchButton.focus({ preventScroll: true });
    }
  });
}

function showTaskSearch(options = {}) {
  const { focus = true } = options;

  taskScheduleView.hidden = true;
  taskTeamsView.hidden = true;
  taskSearchView.hidden = false;
  currentView = "search";
  backToSearchButton.hidden = true;
  taskModalPanel.classList.remove("has-schedule");
  taskModalPanel.classList.remove("has-teams");
  taskModal.setAttribute("aria-labelledby", "task-modal-title");
  taskModal.setAttribute("aria-describedby", "task-modal-description");
  taskModalPanel.scrollTop = 0;

  if (focus) {
    requestAnimationFrame(() => {
      if (!isClosing && !taskModal.hidden && !taskSearchView.hidden) {
        taskSearchInput.focus({ preventScroll: true });
      }
    });
  }
}

function showTeams(options = {}) {
  const { focus = true } = options;

  currentView = "teams";
  taskSearchView.hidden = true;
  taskScheduleView.hidden = true;
  taskTeamsView.hidden = false;
  backToSearchButton.hidden = true;
  taskModalPanel.classList.remove("has-schedule");
  taskModalPanel.classList.add("has-teams");
  taskModal.setAttribute("aria-labelledby", "task-teams-title");
  taskModal.setAttribute("aria-describedby", "task-teams-description");
  taskModalPanel.scrollTop = 0;

  if (focus) {
    requestAnimationFrame(() => {
      if (!isClosing && !taskModal.hidden && currentView === "teams") {
        taskTeamsTitle.focus({ preventScroll: true });
      }
    });
  }
}

function returnToPreviousView() {
  if (previousView === "teams") {
    showTeams({ focus: false });
    taskModalPanel.scrollTop = previousScrollTop;
    previousMemberButton?.focus({ preventScroll: true });
  } else {
    showTaskSearch();
  }
}

function renderSearchResults() {
  const searchTerm = taskSearchInput.value.trim();

  taskSearchResults.replaceChildren();

  if (!searchTerm) {
    return;
  }

  const matches = staffMembers.filter((member) =>
    member.name.includes(searchTerm)
  );

  if (matches.length === 0) {
    const noResultsMessage = createElement(
      "p",
      "task-no-results",
      "找不到這個名字"
    );

    taskSearchResults.append(noResultsMessage);

    return;
  }

  matches.forEach((member) => {
    const resultButton = document.createElement("button");
    const resultText = document.createElement("span");
    const resultName = createElement(
      "span",
      "task-result-name",
      member.name
    );
    const resultGroup = createElement(
      "span",
      "task-result-team",
      member.group
    );
    const resultArrow = createElement("span", "task-result-arrow", "→");

    resultButton.className = "task-result-item";
    resultButton.type = "button";
    resultButton.setAttribute(
      "aria-label",
      `${member.name}，${member.group}，查看個人工作安排`
    );
    resultButton.addEventListener("click", () => {
      showPersonalSchedule(member, resultButton);
    });

    resultArrow.setAttribute("aria-hidden", "true");

    resultText.append(resultName, resultGroup);
    resultButton.append(resultText, resultArrow);
    taskSearchResults.append(resultButton);
  });
}

function openTaskModal(view = "search", opener = openTaskModalButton) {
  clearTimeout(closeTimer);
  isClosing = false;
  pageScrollPosition = window.scrollY;

  taskModal.hidden = false;
  modalOpener = opener;
  modalOpener.setAttribute("aria-expanded", "true");
  previousView = view;
  previousMemberButton = null;
  if (view === "teams") {
    showTeams({ focus: false });
  } else {
    showTaskSearch({ focus: false });
  }
  document.body.style.top = `-${pageScrollPosition}px`;
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    if (isClosing || taskModal.hidden) return;
    taskModal.classList.add("is-open");
    const focusTarget = view === "teams" ? taskTeamsTitle : taskSearchInput;
    focusTarget.focus({ preventScroll: true });
  });
}

function closeTaskModal() {
  if (taskModal.hidden || isClosing) {
    return;
  }

  isClosing = true;
  taskModal.classList.remove("is-open");
  modalOpener.setAttribute("aria-expanded", "false");

  closeTimer = window.setTimeout(() => {
    taskModal.hidden = true;
    showTaskSearch({ focus: false });
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, pageScrollPosition);
    modalOpener.focus({ preventScroll: true });
    isClosing = false;
  }, 300);
}

function keepFocusInsideModal(event) {
  if (event.key !== "Tab" || taskModal.hidden) {
    return;
  }

  const focusableElements = taskModal.querySelectorAll(
    'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])'
  );
  const visibleFocusableElements = [...focusableElements].filter(
    (element) => element.offsetParent !== null
  );
  const firstElement = visibleFocusableElements[0];
  const lastElement = visibleFocusableElements[
    visibleFocusableElements.length - 1
  ];

  if (!firstElement || !lastElement) {
    return;
  }

  const focusIsOutsideControls = !visibleFocusableElements.includes(document.activeElement);
  if (event.shiftKey && (document.activeElement === firstElement || focusIsOutsideControls)) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && (document.activeElement === lastElement || focusIsOutsideControls)) {
    event.preventDefault();
    firstElement.focus();
  }
}

renderTeams();

openTaskModalButton.addEventListener("click", () => openTaskModal());
openTeamsModalButton.addEventListener("click", () => openTaskModal("teams", openTeamsModalButton));
closeTaskModalButton.addEventListener("click", closeTaskModal);
backToSearchButton.addEventListener("click", returnToPreviousView);
taskSearchInput.addEventListener("input", renderSearchResults);

taskModal.addEventListener("click", (event) => {
  if (event.target === taskModal) {
    closeTaskModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !taskModal.hidden) {
    closeTaskModal();
  }

  keepFocusInsideModal(event);
});
