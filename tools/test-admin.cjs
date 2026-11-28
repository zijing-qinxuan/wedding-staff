const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const baseline = require("../data.js");
const staffRoster = require("../staff-roster.js");
const staffPersonalGuide = require("../staff-personal-guide.js");
const staffExecution = require("../staff-execution.js");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const schema = read("apps-script/admin/Schema.gs");
const admin = read("apps-script/admin/Code.gs");
const reader = read("apps-script/public/Code.gs");
const clone = (value) => JSON.parse(JSON.stringify(value));
const owner = "allowed@example.test";
const api = vm.runInNewContext(schema + "\n({ staffSchema_, validateStaff_, publicStaff_, linkStaffNames_ });");

function newDraft() {
  return clone(api.linkStaffNames_({ ...baseline, sections: {}, privateNotes: "" }));
}

test("personal guides separate shared work from explicitly assigned work and preserve multiple roles", () => {
  const data = api.publicStaff_(newDraft());
  const guide = staffPersonalGuide.build(data, "meng-xuan");
  const work = guide.tasks.map(({ text }) => text).join("\n");
  assert(guide.roles.some(({ title, labels }) => title === "甜點組" && labels.includes("組員")));
  assert(guide.roles.some(({ title }) => title === "背板拍照及照片列印"));
  assert(guide.tasks.some(({ kind, when }) => kind === "工作交接" && when === "照片列印服務開始"));
  assert(guide.tasks.some(({ kind }) => kind === "組別期限"));
  assert(guide.tasks.some(({ kind, when }) => kind === "組別共同工作" && when.startsWith("13:30")));
  assert.match(work, /操作印表機/);
  assert.doesNotMatch(work, /陳萱留守|確認構圖|引導、構圖|拍攝並交付|孟萱轉換崗位/);
  const positions = guide.tasks.map(({ when }) => when);
  assert(positions.indexOf("上午") < positions.findIndex((when) => when.startsWith("13:30")));

  const leader = staffPersonalGuide.build(data, "zhu-yu-lin");
  assert(leader.roles.some(({ title, labels }) => title === "集會所招待組" && labels.includes("負責人")));
  assert(leader.roles.some(({ title, labels }) => title === "胸花及胸章發放" && labels.includes("組員")));
  assert(leader.tasks.some(({ text }) => text.includes("工作人員胸章")));
  assert(!leader.tasks.some(({ text }) => text.includes("新郎負責胸花")));

  const camera = staffPersonalGuide.build(data, "a-jie");
  assert(camera.tasks.some(({ kind, when }) => kind === "工作交接" && when === "新娘進場"));
  assert(camera.tasks.some(({ text }) => text.includes("走出小房間")));
  assert(!camera.tasks.some(({ text }) => text.includes("沿走廊前進")));
});

test("personal guide uses published relation IDs, linked times and no private or unconfirmed work", () => {
  const server = simulate();
  const draft = newDraft();
  const person = { id:"single-work-person", name:"測試工作員", internalNote:"private-person-sentinel" };
  draft.people.push(person, { id:"same-name-person", name:person.name }, { id:"candidate-person", name:"尚待核對員" });
  draft.reception.groups = [{
    id:"single-reception-group", name:"測試婚宴組", status:"confirmed", leaderId:person.id,
    memberIds:[person.id, "same-name-person"], candidateIds:["candidate-person"], internalNote:"private-team-sentinel",
    periods:[
      { label:"婚宴入場", scheduleId:"reception-start", items:[
        "整理迎賓用品。", "整理迎賓用品", { text:"private-work-sentinel", hidden:true }
      ] },
      { label:"{person:candidate-person}｜其他工作", items:["還未確定分工"] },
      { label:person.name + "｜同名歧義", items:["不能把同名者的工作指給任何一人"] }
    ]
  }];
  const initialized = server.rpc("initialize", { revision:0, data:draft });
  const published = server.rpc("publish", { revision:initialized.revision });
  const publicData = server.json().data;
  const view = staffPersonalGuide.build(publicData, person.id);
  assert.equal(view.name,"測試工作員");
  assert.deepEqual(view.roles.map(({ labels }) => labels),[["負責人"]]);
  assert.equal(view.tasks.length,1);
  assert.equal(view.tasks[0].when,"18:00　婚宴入場");
  assert.equal(view.tasks[0].kind,"組別共同工作");
  assert.doesNotMatch(JSON.stringify(view),/private-|歧義|分工/);
  assert.deepEqual(staffPersonalGuide.build(publicData, "candidate-person").tasks,[]);

  published.draft.people.find(({ id }) => id === person.id).name = "改名工作員";
  published.draft.reception.groups[0].periods[0].items = ["變更新工作。"];
  const saved = server.rpc("save", { revision:published.revision, data:published.draft });
  assert.equal(staffPersonalGuide.build(server.json().data, person.id).name,"測試工作員");
  assert.doesNotMatch(JSON.stringify(staffPersonalGuide.build(server.json().data, person.id)),/變更新工作/);
  server.rpc("publish", { revision:saved.revision });
  assert.equal(staffPersonalGuide.build(server.json().data, person.id).name,"改名工作員");
  assert.match(JSON.stringify(staffPersonalGuide.build(server.json().data, person.id)),/變更新工作/);
});


test("execution references share canonical group work across overview, detailed timing and personal guides", () => {
  const server = simulate();
  const draft = newDraft();
  const event = draft.schedule[0].events.find(({id}) => id === "guest-entry");
  const team = draft.teams.find(({id}) => id === "dessert");
  const period = team.periods[0];
  team.place = "組別預設地點";
  period.items[0] = {
    id:"linked-setup-test", text:"聯動工作", leaderId:"meng-xuan", memberIds:["a-jie"],
    place:"工作地點覆寫", time:"13:36", detailManaged:true
  };
  event.work = [
    { id:"standalone-test", text:"獨立合作", teamId:team.id, leaderId:"chen-xuan", memberIds:["a-jie"] },
    { id:"reference-test", workId:"linked-setup-test" }
  ];
  const first = server.rpc("initialize",{ revision:0,data:draft });
  const preview = server.rpc("preview",{ data:first.draft });
  const plan = staffExecution.collect(preview,staffPersonalGuide);
  const block = plan.groups.find(({key}) => key === "event-guest-entry");
  assert.deepEqual(block.rows.slice(0,2).map(({text}) => text),["獨立合作","聯動工作"]);
  assert.equal(block.rows[0].place,"組別預設地點");
  assert.equal(block.rows[1].place,"工作地點覆寫");
  assert.equal(block.rows[1].time,"13:36");
  assert.equal(plan.groups.flatMap(({rows}) => rows).filter(({text}) => text === "聯動工作").length,1);

  const guide = (id, snapshot = preview) => staffPersonalGuide.build(snapshot,id,
    { execution:staffExecution.collect(snapshot,staffPersonalGuide) });
  const linked = guide("meng-xuan").tasks.find(({text}) => text === "聯動工作");
  assert.equal(linked.when,"13:36");
  assert.equal(linked.place,"工作地點覆寫");
  assert.equal(linked.kind,"個人分工");
  assert(!guide("meng-xuan").tasks.some(({text}) => text === "獨立合作"));
  assert(!guide("chen-xuan").tasks.some(({text}) => text === "聯動工作"));
  assert(guide("a-jie").tasks.some(({text}) => text === "聯動工作"));
  assert(guide("a-jie").tasks.some(({text}) => text === "獨立合作"));

  const published = server.rpc("publish",{revision:first.revision});
  assert.deepEqual(server.json().data,preview);
  assert.deepEqual(clone(published.draft.schedule[0].events.find(({id})=>id==="guest-entry").work[1]),event.work[1]);

  const edited = clone(published.draft);
  const editedEvent = edited.schedule[0].events.find(({id}) => id === "guest-entry");
  editedEvent.overviewTitle = "只改簡短摘要";
  editedEvent.work.reverse();
  const canonical = edited.teams.find(({id})=>id==="dessert").periods[0].items[0];
  canonical.text = "修改同一筆工作";
  const saved = server.rpc("save",{revision:published.revision,data:edited});
  assert(!guide("meng-xuan",server.json().data).tasks.some(({text})=>text==="修改同一筆工作"));
  const changed = server.rpc("preview",{data:saved.draft});
  assert.equal(staffExecution.collect(changed,staffPersonalGuide).groups.find(({key})=>key==="event-guest-entry").rows[0].text,"修改同一筆工作");
  assert(guide("meng-xuan",changed).tasks.some(({text})=>text==="修改同一筆工作"));

  editedEvent.work[0].hidden = true;
  const hiddenLink = api.publicStaff_(edited);
  assert(!staffExecution.collect(hiddenLink,staffPersonalGuide).groups.some(({rows})=>rows.some(({text})=>text==="修改同一筆工作")));
  assert(guide("meng-xuan",hiddenLink).tasks.some(({text})=>text==="修改同一筆工作"));
  canonical.hidden = true;
  const hiddenSource = api.publicStaff_(edited);
  assert.doesNotMatch(JSON.stringify(hiddenSource),/修改同一筆工作|reference-test/);
});

test("execution schema rejects dangling links, duplicate references and conflicting copies", () => {
  const draft = newDraft();
  const event = draft.schedule[0].events[0];
  event.work = [{ id:"dangling-reference", workId:"missing-item" }];
  assert.throws(()=>api.validateStaff_(draft),/找不到參照/);
  draft.teams[0].periods[0].items[0] = { id:"real-task", text:"測試連結" };
  event.work[0].workId = "real-task";
  event.work[0].place = "不應有重複資料";
  assert.throws(()=>api.validateStaff_(draft),/在引用來源設定/);
  delete event.work[0].place;
  event.work.push({ id:"duplicate-reference", workId:"real-task" });
  assert.throws(()=>api.validateStaff_(draft),/只能引用一次/);
});

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

test("published association data stays intact and the roster only suppresses duplicate members within their own team", () => {
  const draft = newDraft();
  const published = api.publicStaff_(draft);
  for (const team of draft.teams) {
    const output = published.teams.find(({ id }) => id === team.id);
    assert.equal(output.leaderId, team.leaderId);
    assert.deepEqual(clone(output.memberIds), team.memberIds);
    assert.deepEqual([...(output.supportIds || [])], team.supportIds || []);
    assert.deepEqual([...(output.candidateIds || [])], team.candidateIds || []);
    const roles = new Map(staffRoster.teamRoles(output));
    assert.deepEqual(roles.get("組員") || [], team.memberIds.filter((id) => id !== team.leaderId));
    assert.ok(team.memberIds.every((id) => published.people.some((person) => person.id === id)));
  }
  const member = "fixture-person";
  const repeated = {
    leaderId: member, memberIds: [member, member], supportIds: [member, member], candidateIds: [member]
  };
  assert.deepEqual(staffRoster.teamRoles(repeated), [
    ["負責人", [member]], ["支援", [member]], ["待核對", [member]]
  ]);
  assert.deepEqual(staffRoster.teamRoles({ memberIds: [member] }), [["組員", [member]]]);
});

test("distribution rows use published work items and updated people rather than fixed names or member order", () => {
  const draft = newDraft();
  const badges = draft.teams.find(({ id }) => id === "badges");
  const [flower, secondFlower, badge] = badges.memberIds;
  draft.people.find(({ id }) => id === badge).name = "改名測試";
  badges.memberIds.reverse();
  const published = api.publicStaff_(draft);
  const people = new Map(published.people.map(({ id, name }) => [id, name]));
  const team = published.teams.find(({ id }) => id === "badges");
  const roles = staffRoster.distribution(team, people);
  assert.deepEqual(roles.roles, [["胸花發放", [flower, secondFlower]], ["工作人員胸章發放", [badge]]]);
  assert.equal(people.get(roles.roles[1][1][0]), "改名測試");
  const changed = staffRoster.distribution({
    ...team,
    periods: [{ items: [
      "胸花發放：" + people.get(badge) + "、" + people.get(badge),
      "工作人員胸章發放：" + people.get(badge) + "、名單外測試人員"
    ] }]
  }, people);
  assert.deepEqual(changed.roles, [["胸花發放", [badge]], ["工作人員胸章發放", [badge]]]);
  assert.deepEqual(changed.unassigned, [secondFlower, flower]);
});

test("live preview verifies the parent, locks its origin, and only enables editing on request", () => {
  const nonce = "01234567-89ab-4cde-9f01-23456789abcd";
  const posted = [];
  const parent = { postMessage: (data, origin) => posted.push({ data, origin }) };
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
  let received, select, destination;
  window.weddingStaffSource.previewData((data, edit) => { received = data; select = edit; },
    (section) => { destination = section; });
  assert.equal(posted[0].data.nonce, nonce);
  const event = { source: parent, data: { type: "staff-preview-data", nonce, data: baseline } };
  const origin = "https://test-script.googleusercontent.com";
  listener({ ...event, origin: "https://example.test" });
  assert.equal(received, undefined);
  listener({ ...event, origin, data: { ...event.data, nonce: "incorrect" } });
  assert.equal(received, undefined);
  listener({ ...event, origin, source: {}, data: { ...event.data, editing:true } });
  assert.equal(received, undefined);
  listener({ ...event, origin });
  assert.equal(received, baseline);
  assert.equal(select, null);
  listener({ ...event, origin: "https://unrelated.googleusercontent.com", data: { ...event.data, editing:true } });
  assert.equal(select, null);
  listener({ ...event, origin, data: { ...event.data, editing:true } });
  select({ area:"event", id:"staff-arrival" });
  assert.equal(posted.at(-1).origin, origin);
  assert.equal(posted.at(-1).data.target.id, "staff-arrival");
  listener({ ...event, origin, data: { type:"staff-preview-navigate", nonce, section:"teams" } });
  assert.equal(destination, "teams");
});

test("preview verifies the public response by both revision and content", async () => {
  const nonce = "01234567-89ab-4cde-9f01-23456789abcd";
  const posted = [];
  const parent = { postMessage: (data) => posted.push(data) };
  let listener;
  let current = baseline;
  let reads = 0;
  const window = {
    weddingStaffConfig: { publishedUrl:"https://script.google.com/macros/s/verify/exec" },
    parent, addEventListener: (_, handler) => { listener = handler; }
  };
  vm.runInNewContext(read("public-data.js"), {
    window, location: { hash:"#staff-preview=" + nonce }, URL, AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      reads++;
      assert.equal(options.cache,"no-store");
      return { ok:true, json:async () => ({
        ok:true, kind:"wedding-staff-published", version:9, updatedAt:"2026-11-27T11:00:00Z", data:current
      }) };
    }
  });
  window.weddingStaffSource.previewData(() => {});
  const origin = "https://test-script.googleusercontent.com";
  const send = (message) => listener({ source:parent, origin, data:{ ...message, nonce } });
  const verify = { type:"staff-preview-verify", request:"verification", version:9, expected:baseline };
  send(verify);
  assert.equal(reads,0);
  send({ type:"staff-preview-data", data:baseline });
  send(verify);
  await new Promise(setImmediate);
  assert.equal(posted.at(-1).matches,true);
  assert.equal(posted.at(-1).type,"staff-preview-verified");
  assert.equal(posted.at(-1).data,undefined);

  function reverseObjectKeys(value) {
    if (Array.isArray(value)) return value.map(reverseObjectKeys);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reverseObjectKeys(child)]));
  }
  const reordered = reverseObjectKeys(baseline);
  assert.notEqual(JSON.stringify(reordered),JSON.stringify(baseline));
  send({ ...verify, expected:reordered });
  await new Promise(setImmediate);
  assert.equal(posted.at(-1).matches,true);

  send({ ...verify, version:8, expected:reordered });
  await new Promise(setImmediate);
  assert.equal(posted.at(-1).matches,false);

  current = { ...baseline, teams: [...baseline.teams].reverse() };
  send(verify);
  await new Promise(setImmediate);
  assert.equal(posted.at(-1).matches,false);

  send({ ...verify, expected:{ ...baseline, teams:current.teams, privateNotes:"private" } });
  await new Promise(setImmediate);
  assert.equal(posted.at(-1).matches,false);

  current = { ...baseline, weddingInfo: { ...baseline.weddingInfo, title:"不同內容" } };
  send(verify);
  await new Promise(setImmediate);
  assert.equal(posted.at(-1).matches,false);
});

test("the server checks Google identity for every admin operation", () => {
  const server = simulate();
  for (const address of ["", "intruder@example.test"]) {
    server.login(address);
    for (const action of ["load", "preview", "review", "export", "initialize", "save", "publish", "restore"]) {
      assert.throws(() => server.rpc(action), /沒有管理權限/, action);
    }
  }
  assert.equal(server.grid.length, 0);
  assert.equal(server.json().ok, false);
});

test("editor compares changes in Chinese and previews the exact public projection without writing", () => {
  const editor = read("apps-script/admin/Editor.html").match(/<script>([\s\S]+)<\/script>/)[1].replace(/\nreload\(\);\s*$/, "");
  const inertElement = { addEventListener() {} };
  const reviewChanges = vm.runInNewContext(editor + "\nreviewChanges", {
    document:{ getElementById:() => ({ ...inertElement }) }, window:inertElement
  });
  const server = simulate();
  const initialDraft = newDraft();
  initialDraft.teams.find(({id}) => id === "hall-b-ushers").memberIds = ["a-jie"];
  const original = server.rpc("initialize", { revision:0, data:initialDraft });
  const published = server.rpc("publish", { revision:original.revision });
  const changed = clone(published.draft);
  const event = changed.schedule[0].events[0];
  event.time = "09:35–10:00";
  event.summary = "新增測試工作，由友蕾協助。";
  changed.schedule[0].events[1].overviewHidden = true;
  const team = changed.teams.find(({id}) => id === "hall-b-ushers");
  team.leaderId = "zhu-yu-lin";
  team.memberIds = ["zhu-yu-lin", "a-jie"];
  changed.privateNotes = "release-review-private";
  changed.photoGroups.groups = [{ name:"測試新組別" }];
  changed.cameraPositions.reverse();
  const projection = server.rpc("preview", { data:changed });
  assert.equal(server.rpc("load").revision,published.revision);
  assert.doesNotMatch(JSON.stringify(projection), /release-review-private/);
  const saved = server.rpc("save", { revision:published.revision, data:changed });
  assert.equal(server.json().version,published.revision);
  const compare = server.rpc("review", { revision:saved.revision });
  const changes = reviewChanges(compare.before, compare.after, api.staffSchema_());
  assert(changes.some(({ title,after }) => title.includes("時間") && after === "09:35–10:00"));
  assert(changes.some(({ title,after }) => title.includes("組員") && after === "朱育麟、阿傑"));
  assert(changes.some(({ title,after }) => title.includes("工作說明") && after.includes("友蕾")));
  assert(changes.some(({ title,before,after }) => title.includes("從當日總流程隱藏") && before === "顯示" && after === "隱藏"));
  assert(changes.some(({ title }) => title.includes("直播機位") && title.endsWith("順序")));
  assert(changes.some(({ title }) => title.includes("測試新組別") && title.endsWith("新增")));
  assert.doesNotMatch(JSON.stringify(changes), /release-review-private|zhu-yu-lin|a-jie/);
  const later = server.rpc("save", { revision:saved.revision, data:changed });
  assert.throws(() => server.rpc("review", { revision:compare.revision }), /版本衝突/);
  assert.throws(() => server.rpc("publish", { revision:compare.revision }), /版本衝突/);
  server.rpc("publish", { revision:later.revision });
  assert.deepEqual(server.json().data,projection);
});

test("candidate management clears duplicated notes, exposes genuine work links, and keeps unrelated people and tasks", () => {
  const script = read("apps-script/admin/Editor.html").match(/<script>([\s\S]+)<\/script>/)[1].replace(/\nreload\(\);\s*$/, "");
  const inertElement = { addEventListener() {} };
  const editor = vm.runInNewContext(script + "\n({ personLinks, changeCandidate, renamePerson, reviewChanges });", {
    document: { getElementById: () => ({ ...inertElement }) },
    window: inertElement
  });
  const draft = newDraft();
  const original = clone(draft);
  const schema = api.staffSchema_();
  const team = draft.teams.find(({id}) => id === "sign-language");
  const [first, second] = team.candidateIds.map((id) => draft.people.find((person) => person.id === id));
  draft.assignments.push({ personId:second.id, from:"原崗位", to:"手語詩歌傳譯", trigger:"唱詩歌前", returnTo:"回原崗位" });

  editor.changeCandidate(draft,team,second,null,false);
  assert.deepEqual([...team.candidateIds],[first.id]);
  assert.doesNotMatch(team.notes.join(""), /hui-lin-interpreter/);
  const links = editor.personLinks(draft,second,schema);
  assert.equal(links.length,1);
  assert.match(links[0].label,/手語詩歌傳譯/);
  links[0].unlink();
  assert.equal(editor.personLinks(draft,second,schema).length,0);
  assert.doesNotMatch(JSON.stringify(api.publicStaff_(draft)),/慧琳/);
  assert(draft.people.some((person) => person.id === second.id));

  editor.renamePerson(draft,first,"測試傳譯員",schema);
  assert.match(JSON.stringify(api.publicStaff_(draft)),/測試傳譯員/);
  editor.changeCandidate(draft,team,first,first,true);
  assert.equal(team.candidateIds.length,0);
  assert(team.memberIds.includes(first.id));
  assert.deepEqual([...team.notes],["固定攝影機不需為傳譯改變構圖。"]);
  const projection = JSON.stringify(api.publicStaff_(draft));
  assert.doesNotMatch(projection,/待核對；|慧玲|慧琳/);
  assert.match(projection,/慧霖/);
  assert.throws(() => editor.renamePerson(draft,first,"慧霖",schema), /名單已有/);
  const changes = editor.reviewChanges(original,draft,schema);
  assert(changes.some(({ title }) => title.includes("已移除待確認人員：慧玲、慧琳")));
  assert(changes.some(({ title }) => title.includes("已新增組員：測試傳譯員")));
});

test("public reader distinguishes a no-data reply from a failed connection", async () => {
  const server = simulate();
  const window = {};
  window.parent = window;
  let offline = false;
  vm.runInNewContext(read("site-config.js"), { window });
  const { publishedUrl, adminUrl } = window.weddingStaffConfig;
  assert.notEqual(publishedUrl, adminUrl);
  for (const url of [publishedUrl, adminUrl]) {
    assert.match(url, /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/);
  }
  vm.runInNewContext(read("public-data.js"), {
    window,
    location: { hash: "" },
    URL,
    AbortController,
    setTimeout: () => {},
    clearTimeout: () => {},
    crypto: require("node:crypto").webcrypto,
    fetch: async () => {
      if (offline) throw new TypeError("network unavailable");
      return { ok: true, json: async () => server.json() };
    },
    document: {
      createElement: () => ({ remove() {} }),
      head: { append: (script) => script.onerror() }
    }
  });
  const source = window.weddingStaffSource;
  await assert.rejects(source.getLatest(), { code: "PUBLISHED_UNAVAILABLE" });
  const state = server.rpc("initialize", { revision: 0, data: newDraft() });
  await assert.rejects(source.getLatest(), { code: "PUBLISHED_UNAVAILABLE" });
  server.rpc("publish", { revision: state.revision });
  assert.equal((await source.getLatest()).version, 2);
  offline = true;
  await assert.rejects(source.getLatest(), (error) => !error.code && error.message === "無法讀取發布資料");
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
