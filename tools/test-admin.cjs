const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const baseline = require("../data.js");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const schema = read("apps-script/admin/Schema.gs");
const admin = read("apps-script/admin/Code.gs");
const reader = read("apps-script/public/Code.gs");
const clone = (value) => JSON.parse(JSON.stringify(value));
const owner = "allowed@example.test";
const api = vm.runInNewContext(schema + "\n({ validateStaff_, publicStaff_, linkStaffNames_ });");

function newDraft() {
  return clone(api.linkStaffNames_({ ...baseline, sections: {}, privateNotes: "" }));
}

function simulate() {
  const grid = [];
  const ranges = [];
  let exists = false;
  let identity = owner;
  let locked = false;
  let columns = 26;
  const properties = {
    STAFF_ADMIN_EMAILS: owner,
    STAFF_SHEET_ID: "fake-staff-book",
    STAFF_SITE_URL: "https://example.test/wedding-staff/"
  };
  const PropertiesService = { getScriptProperties: () => ({
    getProperty: (key) => properties[key]
  }) };
  const sheet = {
    getLastRow: () => grid.length,
    getMaxRows: () => 1000,
    getMaxColumns: () => columns,
    insertColumnsAfter: (_, delta) => { columns += delta; },
    setFrozenRows() {},
    getRange(row, col, height, width) {
      if (typeof row === "string") return { setNumberFormat() {} };
      return {
        setValues(records) {
          assert(locked);
          records.forEach((record, index) => {
            grid[row + index - 1] ||= [];
            record.forEach((value, colIndex) => {
              grid[row + index - 1][col + colIndex - 1] = value;
            });
          });
        },
        getValues: () => Array.from({ length: height }, (_, r) =>
          Array.from({ length: width }, (_, c) => grid[row + r - 1]?.[col + c - 1] || ""))
      };
    }
  };
  const book = {
    getSheetByName: () => exists ? sheet : null,
    insertSheet: () => { exists = true; return sheet; }
  };
  const context = {
    PropertiesService,
    Session: { getActiveUser: () => ({ getEmail: () => identity }) },
    LockService: { getScriptLock: () => ({
      waitLock: () => { assert(!locked); locked = true; },
      releaseLock: () => { assert(locked); locked = false; }
    }) },
    SpreadsheetApp: { openById: (id) => { assert.equal(id, properties.STAFF_SHEET_ID); return book; }, flush() {} }
  };
  const rpc = vm.runInNewContext(schema + "\n" + admin + "\nadminRequest", context);
  const doGet = vm.runInNewContext(reader + "\ndoGet", {
    PropertiesService,
    Sheets: { Spreadsheets: { Values: { get(id, range) {
      assert.equal(id, properties.STAFF_SHEET_ID);
      ranges.push(range);
      if (!exists) throw new Error("fake private spreadsheet error");
      if (range.endsWith("A2:C")) return { values: grid.slice(1).map((row) => row.slice(0, 3)) };
      const rowNumber = Number(range.match(/Q(\d+):AB/)[1]);
      return { values: [grid[rowNumber - 1].slice(16).filter(Boolean)] };
    } } } },
    ContentService: {
      MimeType: { JAVASCRIPT: "javascript", JSON: "json" },
      createTextOutput: (text) => ({ setMimeType: (type) => ({ text, type }) })
    }
  });
  return {
    rpc: (...args) => clone(rpc(...args)),
    read: (parameters = {}) => doGet({ parameter: parameters }),
    json: () => JSON.parse(doGet().text),
    login: (person) => { identity = person; },
    ranges, grid
  };
}

test("latest local migration keeps the visible guide and links names", () => {
  const draft = newDraft();
  const view = clone(api.publicStaff_(draft));
  assert.deepEqual(view, { ...baseline, sections: {} });
  assert.equal(view.schedule[0].events[0].time, "09:30–10:00");
  assert.equal(view.schedule[1].events[0].id, "stored-items-pickup");
  assert.match(view.photoGroups.steps.join(""), /講台及前方拍照空間完全清空/);
  draft.people.find(({ id }) => id === "you-lei").name = "測試姓名";
  const renamed = api.publicStaff_(draft);
  assert.match(renamed.photoGroups.steps.join(""), /攝影師測試姓名/);
  assert.match(renamed.teams.find(({ id }) => id === "documentary-photo").periods[0].label, /測試姓名/);
  assert.equal(renamed.people.find(({ id }) => id === "you-lei").name, "測試姓名");
});

test("published data excludes hidden records, private notes, and their dependent links", () => {
  const draft = newDraft();
  draft.privateNotes = "private-global";
  draft.teams[0].internalNote = "private-team";
  draft.teams[0].hidden = true;
  draft.schedule[0].events[0].hidden = true;
  draft.schedule[0].events[2].internalNote = "private-event";
  draft.people[0].internalNote = "private-person";
  draft.reception.note = "hidden-reception-sentinel";
  draft.sections.venues = true;
  draft.sections.reception = true;
  const view = api.publicStaff_(draft);
  assert.doesNotMatch(JSON.stringify(view), /private-|staff-arrival|hall-a-ushers|376 號|hidden-reception-sentinel/);
  assert.equal(view.venues, undefined);
  assert.equal(view.weddingInfo.ceremonyAddress, undefined);
  assert.equal(view.reception, undefined);
  assert.equal(view.weddingInfo.receptionHall, undefined);
  assert.equal(view.photoGroups.assistantTeamId, undefined);
});

test("validation rejects arbitrary fields, duplicate IDs, and missing relations", () => {
  const draft = newDraft();
  draft.people[0].privateAddress = "Not part of schema";
  assert.throws(() => api.validateStaff_(draft), /未支援欄位/);
  delete draft.people[0].privateAddress;
  draft.people[1].id = draft.people[0].id;
  assert.throws(() => api.validateStaff_(draft), /ID 重複/);
  draft.people.shift();
  assert.throws(() => api.validateStaff_(draft), /找不到參照/);
});

test("overview, guide routing, roster visibility, and private work items are independent", () => {
  const draft = newDraft();
  const makeup = draft.schedule[0].events.find(({ id }) => id === "makeup");
  assert.equal(makeup.overviewHidden, true);
  assert.deepEqual(makeup.guideTeamIds, ["bridal-aid"]);
  const team = draft.teams.find(({ id }) => id === "bridal-aid");
  team.indexHidden = true;
  const tasks = team.periods[0].items;
  tasks.push({ text: "visible-work-item" }, { text: "private-work-item", hidden: true });
  team.periods.push({ label: "private-period", hidden: true, items: ["private-period-task"] });
  const view = api.publicStaff_(draft);
  const projected = view.teams.find(({ id }) => id === "bridal-aid");
  assert.equal(projected.indexHidden, true);
  assert.equal(projected.periods[0].items.at(-1), "visible-work-item");
  assert.doesNotMatch(JSON.stringify(view), /private-work-item|private-period/);
  assert.deepEqual(clone(view.schedule[0].events.find(({ id }) => id === "makeup").guideTeamIds), ["bridal-aid"]);

  draft.sections.schedule = true;
  const zoom = draft.schedule[0].events.find(({ id }) => id === "zoom-open");
  zoom.time = "14:10";
  const noOverview = api.publicStaff_(draft);
  assert.equal(noOverview.keyTimes, undefined);
  assert.deepEqual(clone(noOverview.schedule[0].events.find(({ id }) => id === "zoom-open")),
    { id: "zoom-open", time: "14:10", timeOnly: true });
  assert.equal(noOverview.schedule[0].events.find(({ id }) => id === "makeup").summary, makeup.summary);
  draft.teams.find(({ id }) => id === "bridal-aid").hidden = true;
  assert.doesNotMatch(JSON.stringify(api.publicStaff_(draft)), /新秘助手|private-work-item/);
});

test("draft preview requires the parent Apps Script origin and the one-time nonce", () => {
  const nonce = "01234567-89ab-4cde-9f01-23456789abcd";
  const posted = [];
  const parent = { postMessage: (data) => posted.push(data) };
  let listener;
  const window = {
    parent,
    addEventListener: (_, handler) => { listener = handler; },
    removeEventListener: () => { listener = null; }
  };
  vm.runInNewContext(read("public-data.js"), {
    window, location: { hash: "#staff-preview=" + nonce },
    get localStorage() { throw new Error("Preview must not use public cache."); }
  });
  let received;
  window.weddingStaffSource.previewData((data) => { received = data; });
  assert.equal(posted[0].nonce, nonce);
  const event = { source: parent, data: { type: "staff-preview-data", nonce, data: baseline } };
  listener({ ...event, origin: "https://example.test" });
  assert.equal(received, undefined);
  listener({ ...event, origin: "https://test-script.googleusercontent.com", data: { ...event.data, nonce: "incorrect" } });
  assert.equal(received, undefined);
  listener({ ...event, origin: "https://test-script.googleusercontent.com" });
  assert.equal(received, baseline);
  assert.equal(listener, null);
});

test("the server checks Google identity for every admin operation", () => {
  const server = simulate();
  for (const address of ["", "intruder@example.test"]) {
    server.login(address);
    for (const action of ["load", "preview", "export", "initialize", "save", "publish", "restore"]) {
      assert.throws(() => server.rpc(action), /沒有管理權限/, action);
    }
  }
  assert.equal(server.grid.length, 0);
  assert.equal(server.json().ok, false);
});

test("publish, draft edits, conflict, backup export, and restore are distinct", () => {
  const server = simulate();
  assert.equal(server.rpc("load").revision, 0);
  const draft = newDraft();
  draft.privateNotes = "private-sentinel";
  const init = server.rpc("initialize", { revision: 0, data: draft });
  assert.equal(server.json().ok, false);
  assert.throws(() => server.rpc("initialize", { revision: 1, data: draft }), /已初始化/);
  const first = server.rpc("publish", { revision: init.revision });
  assert.equal(server.json().version, first.revision);
  assert.doesNotMatch(JSON.stringify(server.json()), /private-sentinel/);
  const changed = clone(first.draft);
  changed.schedule[0].events[0].title = "測試新標題";
  changed.schedule[0].events[0].summary = "文字提及友蕾";
  const next = server.rpc("save", { revision: first.revision, data: changed });
  assert.match(next.draft.schedule[0].events[0].summary, /\{person:you-lei\}/);
  assert.throws(() => server.rpc("save", { revision: first.revision, data: draft }), /版本衝突/);
  assert.equal(server.json().version, first.revision);
  const second = server.rpc("publish", { revision: next.revision, summary: "=unused" });
  assert.equal(second.history.length, 2);
  assert.equal(server.json().data.schedule[0].events[0].title, "測試新標題");
  assert.equal(server.rpc("export", { version: first.revision }).data.privateNotes, "private-sentinel");
  const restored = server.rpc("restore", { revision: second.revision, version: first.revision });
  assert.equal(restored.draft.schedule[0].events[0].title, baseline.schedule[0].events[0].title);
  assert.equal(server.json().version, second.revision);
  const third = server.rpc("publish", { revision: restored.revision });
  assert.equal(third.history.length, 3);
  assert.equal(server.json().data.schedule[0].events[0].title, baseline.schedule[0].events[0].title);
  assert(server.ranges.every((range) => /!A2:C$|!Q\d+:AB\d+$/.test(range)));
  const jsonp = server.read({ callback: "weddingStaffRead_0123456789abcdef0123456789abcdef" });
  assert.equal(jsonp.type, "javascript");
  assert.match(jsonp.text, /^weddingStaffRead_0123456789abcdef0123456789abcdef\(/);
  const invalid = server.read({ callback: "bad.callback" });
  assert.equal(invalid.type, "json");
  assert.equal(JSON.parse(invalid.text).ok, false);
});
