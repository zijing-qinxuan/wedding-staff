// The same field definitions drive editing, validation, and public projection.
function staffSchema_() {
  const text = (label, optional = false) => ({ type: 'text', label, optional });
  const id = (label) => ({ type: 'id', label });
  const person = (label, optional = false) => ({ type: 'person', label, optional });
  const ref = (type, label, optional = false) => ({ type, label, optional });
  const bool = (label) => ({ type: 'bool', label, optional: true });
  const privateText = (label) => ({ ...text(label, true), private: true });
  const list = (label, item, optional = false) => ({ type: 'list', label, item, optional });
  const obj = (label, fields) => ({ type: 'object', label, fields });
  const hide = bool('隱藏於公開網站');
  const status = { type: 'status', label: '確認狀態' };
  const tasks = (label) => list(label, text('說明'));
  const workItem = { ...obj('工作事項', {
    text: text('工作內容'), hidden: bool('僅供管理者查看')
  }), type: 'workItem' };
  const eventRef = (label) => ref('event', label, true);
  const timed = {
    time: text('時間（未連結時使用）'), label: text('名稱'), scheduleId: eventRef('連結總流程時間'),
    status: { ...status, optional: true }, hidden: hide
  };
  const team = obj('工作組別', {
    id: id('組別 ID'), name: text('組別名稱'), leaderId: person('負責人', true),
    memberIds: list('組員', person('人員')), supportIds: list('支援人員', person('人員'), true),
    candidateIds: list('姓名待核對', person('人員'), true), deadline: text('完成期限', true),
    status, hidden: hide, indexHidden: bool('從工作分配索引隱藏'),
    periods: list('各時段工作', obj('工作時段', {
      label: text('時段或工作名稱'), scheduleId: eventRef('連結總流程時間'),
      hidden: bool('此時段僅供管理者查看'),
      items: list('工作內容', workItem)
    })), notes: { ...tasks('重要注意事項'), optional: true },
    internalNote: privateText('內部備註')
  });
  return obj('婚禮資料', {
    weddingInfo: obj('婚禮基本資訊', {
      couple: text('新人'), title: text('網站標題'), date: text('婚禮日期'),
      dateShort: text('簡短日期'), weekday: text('星期'), message: text('首頁訊息'),
      ceremonyVenue: text('婚禮場地'), ceremonyAddress: text('公開場地地址'),
      receptionVenue: text('婚宴場地'), receptionHall: text('婚宴廳別')
    }),
    sections: { ...obj('主要區塊的顯示設定', {
      schedule: bool('隱藏當日總流程'), allocation: bool('隱藏工作分配索引'),
      teams: bool('隱藏工作組別及工作指南的人員分工'),
      venues: bool('隱藏場地布置及座位'), program: bool('隱藏婚禮節目及影音'),
      photos: bool('隱藏攝影及大合照'), cleanup: bool('隱藏撤場'),
      reception: bool('隱藏婚宴')
    }), optional: true },
    privateNotes: privateText('內部備註'),
    keyTimes: list('首頁重要時間', obj('重要時間', {
      time: text('首頁時間'), label: text('名稱'), scheduleId: ref('event', '對應流程'), hidden: hide
    })),
    schedule: list('婚禮日程', obj('日期', {
      id: id('日期 ID'), date: text('日期'), title: text('標題'), hidden: hide,
      events: list('流程項目', obj('流程項目', {
        id: id('流程 ID'), time: text('時間'), title: text('名稱'),
        summary: text('工作摘要'), details: { ...tasks('詳細工作'), optional: true },
        note: text('公開備註', true), internalNote: privateText('內部備註'), status,
        overviewTitle: text('首頁短標題（留空沿用名稱）', true),
        overviewHidden: bool('從首頁總流程隱藏'),
        guideTeamIds: list('顯示完整流程的工作組別', ref('team', '工作組別'), true),
        featured: bool('強調此流程'), hidden: hide
      }))
    })),
    people: list('工作人員', obj('人員', {
      id: id('人員 ID'), name: text('姓名'), internalNote: privateText('內部備註')
    })),
    management: list('現場協調', obj('現場協調人員', {
      role: text('角色'), personId: person('人員'), duties: tasks('工作內容'), note: text('公開備註', true),
      hidden: hide
    })),
    assignments: list('兼任交接', obj('兼任交接', {
      personId: person('人員'), from: text('原崗位'), trigger: text('交接時機'),
      to: text('兼任工作'), returnTo: text('完成後安排'), hidden: hide
    })),
    teams: list('工作組別', team),
    venues: list('場地', obj('場地', {
      id: id('場地 ID'), name: text('名稱'), capacity: text('容量', true),
      purpose: text('用途'), items: tasks('場地說明'), note: text('公開備註', true), hidden: hide
    })),
    seating: obj('座位圖說明', {
      orientation: text('方向'), reserved: text('聾人保留座位'), family: text('親屬優先座位'),
      general: text('一般賓客座位'), removal: text('大合照場地轉換'), disclaimer: text('示意圖說明')
    }),
    ceremony: obj('婚禮節目', {
      start: text('開始時間'), targetEnd: text('目標結束時間'),
      startEventId: eventRef('開始時間連結'), endEventId: eventRef('預計結束時間連結'),
      items: list('節目順序', obj('節目', { title: text('名稱'), detail: text('說明', true), status, hidden: hide }))
    }),
    cameraPositions: list('直播機位', obj('直播機位', {
      id: id('機位 ID'), label: { ...text('公開機位代號，例如 A 或備用', true), maxLength: 8 },
      operatorId: person('負責人', true), operator: text('機位名稱，例如固定攝影機', true),
      device: text('設備'), place: text('位置'), work: text('分工'), hidden: hide
    })),
    avCues: list('影音執行提示', obj('影音提示', {
      moment: text('婚禮環節'), video: text('畫面'), audio: text('聲音及操作'), hidden: hide
    })),
    avChecklist: tasks('影音測試注意事項'),
    equipment: tasks('公開設備配置摘要'),
    avInfo: { ...obj('影音補充說明', {
      operatorId: person('影音負責人', true), note: text('公開進度說明', true)
    }), optional: true },
    photoGroups: obj('正式大合照', {
      status, message: text('合照分組說明', true), location: text('場地'),
      photographerId: person('攝影師', true), hostId: person('主持人', true), host: text('未指派時的主持人說明', true),
      assistantTeamId: ref('team', '協助組別', true), coordination: text('分工'), steps: tasks('拍攝步驟'),
      groups: list('合照分組及拍攝順序', obj('合照組別', {
        name: text('組別名稱'), note: text('組別說明', true), hidden: hide
      }), true)
    }),
    photoServices: list('其他攝影工作', obj('攝影工作', {
      label: text('類別'), title: text('標題'), duties: list('人員分工', obj('分工', {
        personId: person('人員'), work: text('工作內容')
      })), notes: tasks('服務說明'), hidden: hide
    }), true),
    cleanup: obj('撤場', {
      summary: text('撤場說明', true), keyTimes: list('完成期限', obj('期限', timed)),
      storageNote: text('各組撤場暫存提示', true),
      areas: list('場地撤場', obj('場地撤場', {
        name: text('名稱'), leaderId: person('負責人', true), items: tasks('撤場工作'),
        note: text('公開備註', true), hidden: hide
      })),
      logistics: list('物品去向', obj('物品去向', {
        title: text('名稱'), text: text('說明'), status, hidden: hide
      }))
    }),
    reception: obj('婚宴', {
      venue: text('場地'), hall: text('廳別'), times: list('婚宴流程', obj('流程項目', {
        ...timed, detail: text('說明', true)
      })),
      advanceTeam: text('先遣人員說明'), advanceTasks: tasks('先遣工作'), note: text('公開備註', true),
      groups: list('婚宴工作組別', team, true)
    })
  });
}

const STAFF_SECTION_FIELDS = {
  schedule: ['keyTimes'],
  teams: ['teams', 'assignments', 'management'],
  venues: ['venues', 'seating'],
  program: ['ceremony', 'cameraPositions', 'avCues', 'avChecklist', 'equipment', 'avInfo'],
  photos: ['photoGroups', 'photoServices'],
  cleanup: ['cleanup'],
  reception: ['reception']
};

function validateStaff_(data) {
  const refs = [];
  const errors = [];
  const statuses = ['confirmed', 'tentative', 'pending'];
  const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/;
  const tokenPattern = /\{person:([^{}]+)\}/g;
  function visit(value, field, path) {
    if (errors.length >= 22) return;
    if (value === undefined && field.optional) return;
    if (field.type === 'workItem') {
      if (typeof value === 'string') return visit(value, field.fields.text, path);
      return visit(value, { ...field, type: 'object' }, path);
    }
    if (field.type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return errors.push(path + '：需要資料物件');
      Object.keys(value).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(field.fields, key)) errors.push(path + '：含有未支援欄位 ' + key);
      });
      Object.entries(field.fields).forEach(([key, spec]) => visit(value[key], spec, path + ' › ' + spec.label));
      return;
    }
    if (field.type === 'list') {
      if (!Array.isArray(value) || value.length > 250) return errors.push(path + '：需要有效清單（最多 250 筆）');
      value.forEach((item, index) => visit(item, field.item, path + ' ' + (index + 1)));
      return;
    }
    if (field.type === 'bool') {
      if (typeof value !== 'boolean') errors.push(path + '：需要顯示狀態');
      return;
    }
    if (typeof value !== 'string' || value.length > (field.maxLength || (field.private ? 12000 : 2500)) || (!field.optional && !value.trim())) {
      errors.push(path + '：請輸入有效內容');
      return;
    }
    if (!value && field.optional) return;
    if (field.type === 'status' && !statuses.includes(value)) errors.push(path + '：狀態無效');
    if (field.type === 'id' && !idPattern.test(value)) errors.push(path + '：ID 格式有誤');
    if (['person', 'team', 'event'].includes(field.type)) refs.push([field.type, value, path]);
    if (field.type === 'text' && !field.private) {
      for (const token of value.matchAll(tokenPattern)) refs.push(['person', token[1], path]);
    }
  }
  visit(data, staffSchema_(), '婚禮資料');
  if (errors.length) throw new Error(errors.slice(0, 22).join('\n'));
  function index(records, label) {
    const ids = new Set();
    records.forEach(({ id }) => {
      if (ids.has(id)) errors.push(label + ' ID 重複：' + id);
      ids.add(id);
    });
    return ids;
  }
  const ids = {
    person: index(data.people, '人員'), team: index([...data.teams, ...(data.reception.groups || [])], '組別'),
    event: index(data.schedule.flatMap((date) => date.events), '流程')
  };
  index(data.schedule, '日期');
  index(data.venues, '場地');
  index(data.cameraPositions, '機位');
  [...data.teams, ...(data.reception.groups || [])].forEach((team) => {
    ['memberIds', 'supportIds', 'candidateIds'].forEach((key) => {
      const members = team[key] || [];
      if (members.length !== new Set(members).size) errors.push(team.name + '：組員名單有重複人員');
    });
  });
  data.cameraPositions.forEach((camera) => {
    if (!camera.operatorId && !camera.operator) errors.push('機位 ' + camera.id + '：請選擇負責人或填寫機位名稱');
  });
  refs.forEach(([kind, key, path]) => {
    if (!ids[kind].has(key)) errors.push(path + '：找不到參照 ' + key);
  });
  if (errors.length) throw new Error(errors.slice(0, 22).join('\n'));
  if (JSON.stringify(data).length > 240000) throw new Error('資料超過單一版本容量。');
}

function publicStaff_(data) {
  validateStaff_(data);
  const names = new Map(data.people.map(({ id, name }) => [id, name]));
  const publicPeople = new Set();
  function project(value, field) {
    if (value === undefined || field.private) return undefined;
    if (field.type === 'workItem') {
      if (typeof value === 'string') return project(value, field.fields.text);
      return value.hidden ? undefined : project(value.text, field.fields.text);
    }
    if (field.type === 'object') {
      if (value.hidden) return undefined;
      const pairs = [];
      Object.entries(field.fields).forEach(([key, spec]) => {
        if (key === 'hidden') return;
        const item = project(value[key], spec);
        if (item !== undefined) pairs.push([key, item]);
      });
      return Object.fromEntries(pairs);
    }
    if (field.type === 'list') return value.map((item) => project(item, field.item)).filter((item) => item !== undefined);
    if (field.type === 'person' && value) publicPeople.add(value);
    if (field.type !== 'text') return value;
    return value.replace(/\{person:([^{}]+)\}/g, (_, id) => {
      publicPeople.add(id);
      return names.get(id);
    });
  }
  const projection = { sections: { ...data.sections } };
  const schema = staffSchema_().fields;
  // Administrative fields and sections are excluded before traversing references.
  const disabled = new Set(Object.entries(STAFF_SECTION_FIELDS).flatMap(([section, fields]) =>
    data.sections?.[section] ? fields : []
  ));
  Object.entries(schema).forEach(([key, field]) => {
    if (['people', 'sections', 'privateNotes'].includes(key) || disabled.has(key)) return;
    const value = project(data[key], field);
    if (value !== undefined) projection[key] = value;
  });
  if (projection.schedule) {
    const teamIds = new Set((projection.teams || []).map(({ id }) => id));
    const periods = [...(projection.teams || []), ...(projection.reception?.groups || [])].flatMap(({ periods }) => periods);
    const timeLinks = [...periods, ...(projection.cleanup?.keyTimes || []), ...(projection.reception?.times || [])];
    const linked = new Set([
      ...timeLinks.map(({ scheduleId }) => scheduleId), projection.ceremony?.startEventId, projection.ceremony?.endEventId
    ]);
    projection.schedule.forEach(({ events }) => events.forEach((item) => {
      if (item.guideTeamIds) item.guideTeamIds = item.guideTeamIds.filter((id) => teamIds.has(id));
    }));
    if (data.sections?.schedule) {
      projection.schedule = projection.schedule.map((day) => ({
        ...day,
        events: day.events.flatMap((item) => {
          if (item.guideTeamIds?.length) return [item];
          if (linked.has(item.id)) return [{ id: item.id, time: item.time, timeOnly: true }];
          return [];
        })
      }));
    }
    projection.schedule = projection.schedule.filter((day) => day.events.length);
    const visibleEvents = new Set(projection.schedule.flatMap((day) => day.events.map(({ id }) => id)));
    timeLinks.forEach((entry) => {
      if (entry.scheduleId && !visibleEvents.has(entry.scheduleId)) delete entry.scheduleId;
    });
    ['startEventId', 'endEventId'].forEach((key) => {
      if (projection.ceremony?.[key] && !visibleEvents.has(projection.ceremony[key])) delete projection.ceremony[key];
    });
    if (projection.keyTimes) projection.keyTimes = projection.keyTimes.filter(({ scheduleId }) => visibleEvents.has(scheduleId));
  }
  if (data.sections?.venues) {
    delete projection.weddingInfo.ceremonyVenue;
    delete projection.weddingInfo.ceremonyAddress;
  }
  if (data.sections?.reception) {
    delete projection.weddingInfo.receptionVenue;
    delete projection.weddingInfo.receptionHall;
  }
  if (projection.photoGroups) {
    const visibleTeams = new Set((projection.teams || []).map(({ id }) => id));
    if (!visibleTeams.has(projection.photoGroups.assistantTeamId)) delete projection.photoGroups.assistantTeamId;
  }
  projection.people = data.people.filter(({ id }) => publicPeople.has(id)).map(({ id, name }) => ({ id, name }));
  return projection;
}

// Link unique names in free text as well as people selected for structured roles.
function linkStaffNames_(data) {
  const byName = new Map();
  data.people.forEach(({ id, name }) => byName.set(name, byName.has(name) ? null : id));
  const names = [...byName].filter(([name, id]) => id && name.length >= 2).map(([name]) => name).sort((a, b) => b.length - a.length);
  if (!names.length) return data;
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const mentions = new RegExp('\\{person:[^{}]+\\}|' + escaped.join('|'), 'g');
  function visit(value, field) {
    if (field.private || value === undefined) return value;
    if (field.type === 'workItem') {
      return typeof value === 'string' ? visit(value, field.fields.text) : visit(value, { ...field, type: 'object' });
    }
    if (field.type === 'object') return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, visit(item, field.fields[key])])
    );
    if (field.type === 'list') return value.map((item) => visit(item, field.item));
    if (field.type !== 'text' || field.maxLength) return value;
    return value.replace(mentions, (match) => byName.has(match) ? '{person:' + byName.get(match) + '}' : match);
  }
  const root = staffSchema_();
  return { ...visit(data, { ...root, fields: { ...root.fields, people: { private: true } } }), people: data.people };
}
