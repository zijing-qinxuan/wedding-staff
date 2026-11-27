const staffPersonalGuide = (() => {
  "use strict";

  const timedText = /(?:(上午|下午|晚上)\s*)?(\d{1,2})[:：](\d{2})/;
  const phases = [
    /上午|早上|彩排|婚禮佈置|婚禮布置/,
    /賓客入場|賓客抵達|賓客到場|活動期間|開始接收|招待賓客/,
    /婚禮.*開始前/,
    /婚禮|新娘進場|新人進場|婚誓|交換戒指|禱告|全體唱詩/,
    /大合照|節目後|節目結束|婚禮結束|婚禮後/,
    /撤場|撤收|復原|最晚離場/,
    /婚宴|送客/
  ];
  const phaseNames = ["上午準備", "賓客入場及活動", "婚禮開始前", "婚禮期間", "婚禮節目結束後", "撤場", "婚宴", "其他工作"];

  function minute(value = "") {
    const match = value.match(timedText);
    if (!match) return null;
    const [, meridiem, hour, minutes] = match;
    const h = Number(hour);
    if (h > 23 || Number(minutes) > 59) return null;
    return (meridiem ? h % 12 + (meridiem === "上午" ? 0 : 12) : h) * 60 + Number(minutes);
  }

  function phase(value) {
    if (phases[2].test(value)) return 2;
    // Specific later phases take precedence over words such as 「婚禮」.
    for (let index = phases.length - 1; index >= 0; index--) {
      if (phases[index].test(value)) return index;
    }
    return 7;
  }

  function timeline(days) {
    const events = new Map(days.flatMap((day, dayIndex) => (day.events || [])
      .filter((event) => !event.hidden).map((event) => [event.id, { ...event, dayIndex, date: day.date }])));
    const weddingDay = events.get("ceremony-start")?.dayIndex ?? 0;
    const anchors = [
      [0, events.get("staff-arrival")?.time],
      [1, events.get("guest-entry")?.time],
      [3, events.get("ceremony-start")?.time],
      [4, events.get("after-ceremony")?.time, events.get("ceremony-target")?.time],
      [5, events.get("couple-leave")?.time],
      [6, events.get("reception-arrival")?.time, events.get("reception-start")?.time]
    ].map(([index, ...times]) => [index, times.map(minute).find((value) => value !== null)]);
    function position(label, { scheduleId, fallback = 7, reception = false } = {}) {
      const linked = events.get(scheduleId);
      const clock = minute(linked?.time) ?? minute(label);
      const clockStage = clock === null ? 7
        : anchors.reduce((index, [next, start]) => start !== undefined && clock >= start ? next : index, 0);
      let stage = reception ? 6 : clockStage;
      if (stage === 7) stage = phase(label);
      if (stage === 7 && linked && !linked.timeOnly) stage = phase(linked.title || linked.time);
      if (stage === 7) stage = fallback;
      const ceremonyOrder = stage === 3 ? [
        /(?:新娘|新人).*進場|走出小房間|上台/, /演講/, /婚誓前|婚誓開始前/, /婚誓|交換戒指/, /禱告/, /唱詩/
      ].findIndex((pattern) => pattern.test(label)) : -1;
      const linkedTime = linked?.time || "";
      const when = linkedTime && label && !label.includes(linkedTime) ? linkedTime + "　" + label : label || linkedTime || phaseNames[stage];
      const date = linked && linked.dayIndex !== weddingDay ? linked.date + "｜" : "";
      const phaseStart = anchors.find(([index]) => stage === index)?.[1];
      return {
        when: date + when,
        order: [linked?.dayIndex ?? weddingDay, stage, clock ?? phaseStart ?? Infinity, clock === null ? 1 : 0, ceremonyOrder]
      };
    }
    return { events, position };
  }

  function namesFor(people) {
    const names = new Map();
    const byId = new Map();
    for (const { id, name } of people) {
      if (!name) continue;
      byId.set(id, name);
      names.set(name, [...(names.get(name) || []), id]);
    }
    const escape = (value) => value.replace(/[.*+?^|\x24{}()[\]\\]/g, "\\$&");
    const alternatives = [...names.keys()].sort((a, b) => b.length - a.length).map(escape);
    const ref = "\\{person:([^{}]+)\\}" + (alternatives.length ? "|" + alternatives.join("|") : "");
    const mention = new RegExp(ref, "g");
    const first = new RegExp("^(?:" + ref + ")");
    const separator = /^\s*(?:、|／|\/|及|與|和)\s*/;
    const display = (text = "") => text.replace(/\{person:([^{}]+)\}/g, (_, id) => byId.get(id) || "待公布");

    function readNames(input) {
      let rest = input.trim();
      const ids = [];
      let ambiguous = false;
      for (let match = first.exec(rest); match; match = first.exec(rest)) {
        const candidates = match[1] ? (byId.has(match[1]) ? [match[1]] : []) : names.get(match[0]);
        if (candidates.length === 1) ids.push(candidates[0]);
        else ambiguous = true;
        rest = rest.slice(match[0].length).replace(/^\s*[（(][^）)]*[）)]/, "").trimStart();
        const join = rest.match(separator);
        if (!join || !first.test(rest.slice(join[0].length))) break;
        rest = rest.slice(join[0].length);
      }
      return ids.length || ambiguous ? { ids, ambiguous, rest } : null;
    }

    function heading(text) {
      const [prefix, ...tail] = text.split(/[｜：:]/);
      const list = readNames(prefix);
      return list && !list.rest ? { ...list, label: tail.join("｜") } : null;
    }

    function subject(text) {
      const value = text.trim().replace(/^[\w-]{1,8}[：:]\s*/, "");
      const firstMention = value.matchAll(mention).next().value;
      if (!firstMention) return null;
      const prefix = value.slice(0, firstMention.index);
      if (prefix && !/^(?:由\s*|[^，。；]{1,30}(?:後|前|時)\s*(?:由\s*)?)$/.test(prefix)) return null;
      const list = readNames(value.slice(firstMention.index));
      if (!list || !/^(?:當|於|在|先|可|應|須|將|會|負責|協調|統籌|轉|留守|留在|接續|分別|確認|撤收|拍攝|列印|送|完成|加入|協助|接收|[，、：:]|$)/.test(list.rest)) return null;
      const trigger = prefix.replace(/\s*由\s*$/, "") || list.rest.match(/^(?:於|在)([^，。；]{1,20}?(?:前|後|時))/)?.[1];
      return { ...list, trigger };
    }

    return { byId, display, heading, subject };
  }

  function workText(value) {
    if (typeof value === "string") return value;
    return !value?.hidden && value?.text || "";
  }

  const remainder = /^(?:其餘|其他)(?:同組人員|組員|招待員|工作人員)/;
  const delegated = /(?:^|[，。；])由[^，。；]{1,20}(?:負責|執行|攜帶|處理|統籌)/;

  function splitWork(text, subject) {
    // A new subject or 「其餘組員」 starts a separate assignment. Other
    // punctuation belongs to the same instruction, including its objects.
    const parts = text.split(/([，；。、])/);
    const blocks = [];
    let current = parts[0];
    for (let i = 1; i < parts.length; i += 2) {
      const punctuation = parts[i];
      const next = parts[i + 1]?.trimStart() || "";
      const separate = punctuation !== "、" || Boolean(subject(current)?.rest);
      if (next && separate && (subject(next) || remainder.test(next))) {
        blocks.push(current + (punctuation === "。" ? punctuation : ""));
        current = next;
      } else current += punctuation + next;
    }
    if (current) blocks.push(current);
    return blocks;
  }

  function build(data, personId, { guideByTeam = new Map(), guideByManager = new Map() } = {}) {
    const names = namesFor(data.people || []);
    if (!names.byId.has(personId)) return null;
    const flow = timeline((data.schedule || []).filter((day) => !day.hidden));
    const settings = data.sections || {};
    const teams = settings.teams ? [] : (data.teams || []).filter((team) => !team.hidden);
    const handoffs = settings.teams ? [] : (data.assignments || []).filter((item) => !item.hidden && item.personId === personId);
    const reception = settings.reception ? null : data.reception;
    const services = settings.photos ? [] : (data.photoServices || []).filter((service) => !service.hidden);
    const backdrop = services.find((service) => /背板/.test(service.label));
    const backdropStart = backdrop?.notes?.map((note) =>
      note.match(/(賓客(?:入場|抵達|到場))[^，。；]{0,3}[，、]?[^，。；]{0,10}(?:開始|開放)/)?.[1]
    ).find(Boolean);
    const backdropFallback = backdropStart ? phase(backdropStart) : 7;
    const scopeFor = (team, banquet = false) => ({
      title: team.name,
      target: guideByTeam.get(team.id) || (banquet ? "reception" : "")
    });
    const roles = new Map();
    const rows = new Map();
    const compact = (text) => text.trim().replace(/[。.]$/, "");
    const sameSource = (name, from) => name === from || name === from + "組";
    const triggerKey = (value = "") => value.replace(/服務/g, "").replace(/[後時]$/, "");
    function role(scope, label) {
      const key = scope.title + "\0" + scope.target;
      if (!roles.has(key)) roles.set(key, { ...scope, labels: [] });
      const labels = roles.get(key).labels;
      if (!labels.includes(label)) labels.push(label);
    }
    function add(scope, kind, text, label = "", options = {}) {
      if (!text) return;
      const timing = flow.position(label, options);
      timing.order.push(kind === "工作交接" ? -1 : 0);
      const content = names.display(text);
      const key = [kind, compact(content), timing.when].join("\0");
      const previous = rows.get(key);
      if (!previous) rows.set(key, { ...timing, kind, scopes: [scope], text: content });
      else if (!previous.scopes.some(({ title }) => title === scope.title)) previous.scopes.push(scope);
    }

    function periodTasks(scope, items, label, { member, owner, timing } = {}) {
      for (const item of items) {
        const text = workText(item);
        if (!text) continue;
        let preceding;
        splitWork(text, names.subject).forEach((clause) => {
          const subject = names.subject(clause);
          if (subject) {
            preceding = subject;
            if (subject.ids.includes(personId)) {
              // The structured handoff gives the destination and what follows
              // when a prose note only repeats that the person switches roles.
              if (compact(subject.rest) === "轉換崗位" && subject.trigger && handoffs.some((item) =>
                sameSource(scope.title, item.from) && triggerKey(subject.trigger) === triggerKey(item.trigger))) return;
              const options = backdropFallback !== 7 && /照片列印|背板拍照/.test(subject.trigger || "")
                ? { ...timing, fallback: backdropFallback } : timing;
              add(scope, "個人分工", clause, subject.trigger || label, options);
            }
          } else if (owner && !remainder.test(clause)) {
            if (owner.ids.includes(personId)) add(scope, "個人分工", clause, label, timing);
          } else if (member && !delegated.test(clause) &&
              (!remainder.test(clause) || preceding && !preceding.ambiguous && !preceding.ids.includes(personId))) {
            // The grouped notes keep their source context; don't attach an
            // explicitly named task to all members of its team.
            add(scope, "組別共同工作", clause, label, timing);
          }
        });
      }
    }

    function collectTeam(team, banquet) {
      const scope = scopeFor(team, banquet);
      const leader = team.leaderId === personId;
      const regular = (team.memberIds || []).includes(personId);
      const support = (team.supportIds || []).includes(personId);
      const active = leader || regular || support;
      if (leader) role(scope, "負責人");
      else if (regular) role(scope, "組員");
      if (support) role(scope, "支援");
      if ((team.candidateIds || []).includes(personId)) {
        role(scope, "姓名待核對");
        if (!active) return;
      }
      const options = { reception: banquet };
      if (active) add(scope, "組別期限", team.deadline, team.deadline?.match(timedText)?.[0] || "完成期限", { ...options, fallback: phase(team.deadline || "") });

      for (const period of team.periods || []) {
        if (period.hidden) continue;
        const owner = names.heading(period.label);
        let label = owner?.label || (owner ? "" : period.label);
        const fallback = team.id === "backdrop-photo-print" ? backdropFallback : 7;
        if (fallback !== 7 && !period.scheduleId && phase(label) === 7 && minute(label) === null) {
          label = [backdropStart, label].filter(Boolean).join("｜");
        }
        const items = period.items || [];
        items.forEach((item) => {
          const text = workText(item);
          // Named camera positions and fixed cameras are covered by their
          // structured operators where that section is published.
          const cameraCode = period.label === "機位" && text.match(/^([\w-]+)[：:]/)?.[1];
          const camera = cameraCode && !settings.program && data.cameraPositions?.find((entry) =>
            !entry.hidden && (entry.label === cameraCode || entry.id === cameraCode));
          if (camera) return;
          if (cameraCode && !names.subject(text)) return;
          periodTasks(scope, [item], label, { member: active, owner, timing: { ...options, scheduleId: period.scheduleId, fallback } });
        });
      }
      periodTasks(scope, team.notes || [], "", { timing: options });
      for (const event of flow.events.values()) {
        if (event.timeOnly || !event.guideTeamIds?.includes(team.id)) continue;
        const optionsForEvent = { ...options, scheduleId: event.id };
        const label = event.status === "tentative" && !/^(預計|暫定)/.test(event.title) ? "預計" + event.title : event.title;
        periodTasks(scope, [event.summary, ...(event.details || [])], label, { member: active, timing: optionsForEvent });
      }
    }

    teams.forEach((team) => collectTeam(team, false));
    (reception?.groups || []).filter((team) => !team.hidden).forEach((team) => collectTeam(team, true));
    if (reception && names.heading(reception.advanceTeam || "")?.ids.includes(personId)) {
      const scope = { title: "婚宴先遣", target: "reception" };
      role(scope, "先遣人員");
      periodTasks(scope, reception.advanceTasks || [], "婚宴前", { member: true, timing: { reception: true } });
    }

    if (!settings.teams) {
      for (const item of data.management || []) {
        if (item.hidden || item.personId !== personId) continue;
        const scope = { title: names.display(item.role), target: guideByManager.get(item.role) || "guide-operations" };
        role(scope, "負責人");
        (item.duties || []).forEach((task) => add(scope, "個人分工", workText(task)));
      }
      for (const item of handoffs) {
        const from = teams.find(({ name }) => sameSource(name, item.from));
        const scope = from ? scopeFor(from) : { title: item.from, target: "" };
        role(scope, "兼任 " + names.display(item.to));
        const fallback = /照片列印|背板拍照/.test(item.to) ? backdropFallback : 7;
        add(scope, "工作交接", "從" + item.from + "轉至" + item.to + "。" + item.returnTo.replace(/[。.]$/, "") + "。", item.trigger, { fallback });
      }
    }

    if (!settings.program) {
      const video = teams.find(({ id }) => id === "livestream");
      const scope = video ? scopeFor(video) : { title: "直播機位", target: "program" };
      (data.cameraPositions || []).forEach((camera, index) => {
        if (camera.hidden || camera.operatorId !== personId) return;
        const code = camera.label || (/^[a-z0-9]{1,3}$/i.test(camera.id) ? camera.id : String(index + 1));
        const position = "機位 " + code;
        const trigger = handoffs.find((entry) => entry.to.endsWith(position))?.trigger || camera.work.match(/(?:新娘|新人)?進場/)?.[0];
        role(scope, position);
        add(scope, "個人分工", [camera.place, camera.work].filter(Boolean).join("｜"),
          [trigger, position].filter(Boolean).join("｜"), { fallback: 3 });
      });
      if (data.avInfo?.operatorId === personId) {
        const av = teams.find(({ id }) => id === "av");
        role(av ? scopeFor(av) : { title: "影音及直播", target: "program" }, "焦點視訊操作");
      }
    }

    if (!settings.photos) {
      const photo = data.photoGroups;
      if (photo?.photographerId === personId || photo?.hostId === personId) {
        const scope = { title: "正式大合照", target: "photos" };
        if (photo.photographerId === personId) role(scope, "攝影");
        if (photo.hostId === personId) role(scope, "主持");
        add(scope, "個人分工", [photo.location, photo.photographerId === personId && "攝影", photo.hostId === personId && "主持"].filter(Boolean).join("｜"), "大合照");
      }
      const backdropTeam = teams.find(({ id }) => id === "backdrop-photo-print");
      for (const service of services) {
        for (const duty of service.duties || []) {
          if (duty.hidden || duty.personId !== personId) continue;
          const scope = service === backdrop && backdropTeam ? scopeFor(backdropTeam) : { title: service.title, target: "guide-photography" };
          role(scope, "個人分工");
          add(scope, "個人分工", duty.work, service === backdrop ? backdropStart : undefined);
        }
      }
    }

    if (!settings.cleanup && data.cleanup) {
      for (const area of data.cleanup.areas || []) {
        if (area.hidden) continue;
        const scope = { title: area.name, target: "cleanup" };
        if (area.leaderId === personId) {
          role(scope, "負責人");
          add(scope, "撤場確認", area.note, "撤場");
        }
        periodTasks(scope, area.items || [], "撤場");
      }
      for (const item of data.cleanup.logistics || []) {
        if (!item.hidden) periodTasks({ title: item.title, target: "cleanup" }, [item.text], "撤場");
      }
    }

    const tasks = [...rows.values()].sort((a, b) => {
      for (let index = 0; index < a.order.length; index++) {
        if (a.order[index] !== b.order[index]) return a.order[index] - b.order[index];
      }
      return 0;
    });
    return { name: names.byId.get(personId), roles: [...roles.values()], tasks };
  }

  return { build };
})();

if (typeof module !== "undefined" && module.exports) module.exports = staffPersonalGuide;
