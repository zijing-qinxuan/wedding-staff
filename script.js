const staffMembers = [
  {
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
  }
];

const taskModal = document.querySelector("#task-modal");
const taskModalPanel = taskModal.querySelector(".task-modal-panel");
const openTaskModalButton = document.querySelector("#open-task-modal");
const closeTaskModalButton = document.querySelector("#close-task-modal");
const taskSearchView = document.querySelector("#task-search-view");
const taskScheduleView = document.querySelector("#task-schedule-view");
const backToSearchButton = document.querySelector("#back-to-task-search");
const taskSearchInput = document.querySelector("#task-name-search");
const taskSearchResults = document.querySelector("#task-search-results");
const taskScheduleName = document.querySelector("#task-schedule-name");
const taskScheduleMeta = document.querySelector("#task-schedule-meta");
const personalTaskList = document.querySelector("#personal-task-list");
const personalTableTitle = document.querySelector("#personal-table-title");
const personalTableDescription = document.querySelector(
  "#personal-table-description"
);

let pageScrollPosition = 0;
let closeTimer;
let isClosing = false;

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
  personalTableTitle.textContent = `第 ${member.table} 桌`;
  personalTableDescription.textContent =
    `工作完成後，請前往第 ${member.table} 桌入席。`;
}

function showPersonalSchedule(member) {
  renderPersonalSchedule(member);

  taskSearchView.hidden = true;
  taskScheduleView.hidden = false;
  backToSearchButton.hidden = false;
  taskModalPanel.classList.add("has-schedule");
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
  taskSearchView.hidden = false;
  backToSearchButton.hidden = true;
  taskModalPanel.classList.remove("has-schedule");
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
      showPersonalSchedule(member);
    });

    resultArrow.setAttribute("aria-hidden", "true");

    resultText.append(resultName, resultGroup);
    resultButton.append(resultText, resultArrow);
    taskSearchResults.append(resultButton);
  });
}

function openTaskModal() {
  clearTimeout(closeTimer);
  isClosing = false;
  pageScrollPosition = window.scrollY;

  taskModal.hidden = false;
  openTaskModalButton.setAttribute("aria-expanded", "true");
  document.body.style.top = `-${pageScrollPosition}px`;
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    taskModal.classList.add("is-open");
    taskSearchInput.focus();
  });
}

function closeTaskModal() {
  if (taskModal.hidden || isClosing) {
    return;
  }

  isClosing = true;
  taskModal.classList.remove("is-open");
  openTaskModalButton.setAttribute("aria-expanded", "false");

  closeTimer = window.setTimeout(() => {
    taskModal.hidden = true;
    showTaskSearch({ focus: false });
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, pageScrollPosition);
    openTaskModalButton.focus();
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

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

openTaskModalButton.addEventListener("click", openTaskModal);
closeTaskModalButton.addEventListener("click", closeTaskModal);
backToSearchButton.addEventListener("click", () => showTaskSearch());
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
