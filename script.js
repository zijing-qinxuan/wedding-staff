const staffMembers = [
  {
    name: "王小明",
    team: "招待組"
  },
  {
    name: "林小華",
    team: "婚宴組"
  }
];

const taskModal = document.querySelector("#task-modal");
const openTaskModalButton = document.querySelector("#open-task-modal");
const closeTaskModalButton = document.querySelector("#close-task-modal");
const taskSearchInput = document.querySelector("#task-name-search");
const taskSearchResults = document.querySelector("#task-search-results");

let pageScrollPosition = 0;
let closeTimer;
let isClosing = false;

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
    const noResultsMessage = document.createElement("p");

    noResultsMessage.className = "task-no-results";
    noResultsMessage.textContent = "找不到這個名字";
    taskSearchResults.append(noResultsMessage);

    return;
  }

  matches.forEach((member) => {
    const resultButton = document.createElement("button");
    const resultText = document.createElement("span");
    const resultName = document.createElement("span");
    const resultTeam = document.createElement("span");
    const resultArrow = document.createElement("span");

    resultButton.className = "task-result-item";
    resultButton.type = "button";
    resultButton.setAttribute(
      "aria-label",
      `${member.name}，${member.team}`
    );

    resultName.className = "task-result-name";
    resultName.textContent = member.name;

    resultTeam.className = "task-result-team";
    resultTeam.textContent = member.team;

    resultArrow.className = "task-result-arrow";
    resultArrow.setAttribute("aria-hidden", "true");
    resultArrow.textContent = "→";

    resultText.append(resultName, resultTeam);
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
    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

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
