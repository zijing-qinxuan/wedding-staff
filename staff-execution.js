const staffExecution = (() => {
  "use strict";

  const text = (value) => typeof value === "string" ? value : value?.hidden ? "" : value?.text || "";
  const people = (work) => [...new Set([work?.leaderId, ...(work?.memberIds || [])].filter(Boolean))];
  const compare = (a, b) => {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return 0;
  };

  function collect(data, timing) {
    const settings = data.sections || {};
    const teams = [...(settings.teams ? [] : data.teams || []),
      ...(settings.reception ? [] : data.reception?.groups || [])].filter((team) => !team.hidden);
    const byTeam = new Map(teams.map((team) => [team.id, team]));
    const days = (data.schedule || []).filter((day) => !day.hidden);
    const flow = timing.timeline(days);
    const linked = new Map();
    const standalone = [];
    const groups = new Map();
    const registered = new Map();
    const byWork = new Map();
    // Match only a venue name explicitly present in the group title.
    const venueNames = settings.venues ? [] : (data.venues || []).filter((venue) => !venue.hidden)
      .flatMap(({ name }) => [name, ...name.split("｜").map((part) => part.trim())]).filter(Boolean)
      .sort((a,b) => b.length - a.length);
    function place(work, team) {
      if (settings.venues) return "";
      return work?.place || team?.place || venueNames.find((name) => team?.name.startsWith(name)) || "";
    }
    function add(row) {
      if (!row.text) return;
      const event = flow.events.get(row.scheduleId);
      const position = flow.position(row.time || row.phase || "", { scheduleId: row.scheduleId, time: row.time });
      const stage = position.order[1];
      const key = event ? "event-" + event.id : row.time ? "time-" + row.time : "stage-" + stage;
      const title = event?.status === "tentative" && !/^(預計|暫定)/.test(event.title) ? "預計" + event.title : event?.title;
      const label = event ? [event.dayIndex && event.date, event.time, title].filter(Boolean).join("　")
        : row.time || timing.phaseNames[stage];
      if (!groups.has(key)) {
        const order = event ? flow.position(event.title, { scheduleId: row.scheduleId }).order : position.order;
        groups.set(key, { key, label, order, rows: [] });
      }
      const group = groups.get(key);
      const identity = JSON.stringify([row.text.trim().replace(/[。.]$/, ""), row.team?.id || row.scope,
        row.time, row.place, row.leaderId, row.memberIds]);
      if (!row.work?.id && group.rows.some((item) => item.identity === identity)) return;
      group.rows.push({ ...row, identity });
    }
    const rowsFor = (team, period, value, periodIndex, itemIndex) => {
      const work = typeof value === "string" ? { text: value } : value;
      const source = linked.get(work?.id);
      return {
        text: text(value), work, team, place: place(work, team), leaderId: work?.leaderId,
        memberIds: work?.memberIds, scheduleId: source?.eventId || period.scheduleId,
        time: work?.time || (!source && timing.minute(period.label) !== null ? period.label : ""),
        phase: work?.phase || (!source ? period.label : ""),
        target: source?.target || { area: "team", id: team.id, periodIndex, itemIndex }
      };
    };

    for (const team of teams) {
      (team.periods || []).filter((period) => !period.hidden).forEach((period, periodIndex) => {
        (period.items || []).filter((item) => !item?.hidden).forEach((item, itemIndex) => {
          if (item?.id) byWork.set(item.id, { team, period, item, periodIndex, itemIndex });
        });
      });
    }
    if (!settings.schedule) for (const event of flow.events.values()) {
      if (event.timeOnly) continue;
      for (const [index, item] of (event.work || []).entries()) {
        if (item.hidden) continue;
        const target = { area: "event", id: event.id, field: "work", workId: item.id };
        if (item.workId && byWork.has(item.workId)) linked.set(item.workId, { eventId: event.id, target });
        else if (!item.workId && (!item.teamId || byTeam.has(item.teamId))) {
          const team = byTeam.get(item.teamId);
          const row = {
            text: text(item), work: item, team, scope: event.title, place: place(item, team),
            leaderId: item.leaderId, memberIds: item.memberIds, scheduleId: event.id,
            time: item.time, phase: item.phase, target
          };
          standalone.push(row);
          registered.set(event.id + "\0" + index, row);
        }
      }
    }

    // Manual rows use their authored order before the derived rows for an event.
    for (const event of flow.events.values()) {
      if (settings.schedule || event.timeOnly) continue;
      for (const [index, item] of (event.work || []).entries()) {
        const reference = byWork.get(item.workId);
        if (!item.hidden && reference && linked.has(item.workId)) {
          const { team, period, item: work, periodIndex, itemIndex } = reference;
          add(rowsFor(team, period, work, periodIndex, itemIndex));
        } else {
          const row = registered.get(event.id + "\0" + index);
          if (row) add(row);
        }
      }
    }
    for (const team of teams) {
      (team.periods || []).filter((period) => !period.hidden).forEach((period, periodIndex) => {
        (period.items || []).filter((item) => !item?.hidden).forEach((item, itemIndex) => {
          if (!item?.detailManaged && !linked.has(item?.id)) add(rowsFor(team, period, item, periodIndex, itemIndex));
        });
      });
    }
    if (!settings.schedule) for (const event of flow.events.values()) {
      if (event.timeOnly) continue;
      const covered = (event.guideTeamIds || []).map((id) => byTeam.get(id)).filter(Boolean);
      for (const team of covered) {
        for (const description of [event.summary, ...(event.details || [])]) {
          add({ text: description, team, scheduleId: event.id, place: place(null, team) });
        }
      }
      if (!covered.length && !groups.has("event-" + event.id) && !event.overviewHidden) {
        add({ text: event.summary, scheduleId: event.id });
      }
    }
    if (!settings.teams) {
      for (const manager of data.management || []) {
        if (manager.hidden) continue;
        for (const work of manager.duties || []) add({
          text: work, scope: manager.role, leaderId: manager.personId
        });
      }
      for (const item of data.assignments || []) {
        if (item.hidden) continue;
        const scope = item.from + " → " + item.to;
        add({ text: item.returnTo, scope, leaderId: item.personId, phase: item.trigger, handoff: true });
      }
    }
    if (!settings.cleanup) for (const area of data.cleanup?.areas || []) {
      if (area.hidden) continue;
      for (const work of area.items || []) add({
        text: work, scope: area.name, leaderId: area.leaderId, coordinating: true,
        phase: "撤場", place: settings.venues ? "" : area.name
      });
    }
    if (!settings.reception) for (const work of data.reception?.advanceTasks || []) add({
      text: work, scope: "婚宴先遣", phase: "婚宴",
      place: settings.venues ? "" : data.reception.venue
    });

    return { rowsFor, standalone, groups: [...groups.values()].sort((a,b) => compare(a.order,b.order)) };
  }

  return { collect, compare, people, text };
})();

if (typeof module !== "undefined" && module.exports) module.exports = staffExecution;
