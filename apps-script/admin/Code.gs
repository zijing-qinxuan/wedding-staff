const STAFF_TAB = '婚禮工作版本';
const STAFF_CHUNKS = 12;
const STAFF_WIDTH = 4 + 2 * STAFF_CHUNKS;
const STAFF_HEADER = [
  'revision', 'action', 'updatedAt', 'summary',
  ...Array.from({ length: STAFF_CHUNKS }, (_, i) => 'draft' + (i + 1)),
  ...Array.from({ length: STAFF_CHUNKS }, (_, i) => 'public' + (i + 1))
];

function doGet() {
  try {
    requireAdmin_();
    return HtmlService.createHtmlOutputFromFile('Editor')
      .setTitle('婚禮工作指南｜管理')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  } catch (_) {
    return HtmlService.createHtmlOutput('這個 Google 帳號沒有婚禮工作資料的管理權限。').setTitle('無管理權限');
  }
}

// All browser operations enter here. Helpers ending in "_" are private to the script.
function adminRequest(action, input) {
  requireAdmin_();
  const payload = input || {};
  const sheet = () => staffSheet_();
  switch (action) {
    case 'load': {
      const state = staffState_(sheet());
      return { ...state, schema: staffSchema_(), siteUrl: staffSiteUrl_() };
    }
    case 'preview':
      validateStaff_(payload.data);
      return publicStaff_(linkStaffNames_(payload.data));
    case 'review': {
      const target = sheet();
      const rows = staffRows_(target);
      const last = rows[rows.length - 1];
      if (!last || payload.revision !== last.revision) throw staffConflict_();
      const published = rows.filter(({ action }) => action === 'publish').pop();
      return { before: readPrivate_(target, published), after: readPrivate_(target, last), revision: last.revision };
    }
    case 'export': {
      const target = sheet();
      const rows = staffRows_(target);
      const entry = payload.version === undefined ? rows[rows.length - 1] : rows.find(
        (row) => row.revision === payload.version && row.action === 'publish'
      );
      if (!entry) throw new Error('沒有可匯出的版本。');
      return { version: entry.revision, updatedAt: entry.updatedAt, data: readPrivate_(target, entry) };
    }
    case 'initialize':
    case 'save':
    case 'publish':
    case 'restore':
      return changeStaff_(action, payload);
    default:
      throw new Error('不支援的管理操作。');
  }
}

function requireAdmin_() {
  const property = PropertiesService.getScriptProperties().getProperty('STAFF_ADMIN_EMAILS') || '';
  const allowed = property.split(/[\s,;]+/).filter(Boolean).map((email) => email.toLowerCase());
  const current = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!current || !allowed.includes(current)) throw new Error('你目前使用的 Google 帳號沒有管理權限。');
}

function staffSiteUrl_() {
  const url = (PropertiesService.getScriptProperties().getProperty('STAFF_SITE_URL') || '').trim();
  if (!/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?\/(?:[a-z0-9._~/-]*)$/i.test(url)) {
    throw new Error('STAFF_SITE_URL 必須是工作人員網站的 HTTPS 網址，不含查詢參數或錨點。');
  }
  return url;
}

function staffSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('STAFF_SHEET_ID');
  if (!id) throw new Error('尚未設定 STAFF_SHEET_ID。');
  const book = SpreadsheetApp.openById(id);
  const sheet = book.getSheetByName(STAFF_TAB);
  if (!sheet) return null;
  // Do not append to an unrelated tab.
  const header = sheet.getRange(1, 1, 1, STAFF_WIDTH).getValues()[0];
  if (header.join('|') !== STAFF_HEADER.join('|')) throw new Error('版本表欄位不符，請確認使用專用的工作人員試算表。');
  return sheet;
}

function createStaffSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('STAFF_SHEET_ID');
  const book = SpreadsheetApp.openById(id);
  const sheet = book.insertSheet(STAFF_TAB);
  if (sheet.getMaxColumns() < STAFF_WIDTH) sheet.insertColumnsAfter(sheet.getMaxColumns(), STAFF_WIDTH - sheet.getMaxColumns());
  sheet.getRange(1, 1, 1, STAFF_WIDTH).setValues([STAFF_HEADER]);
  sheet.getRange('C:D').setNumberFormat('@');
  sheet.setFrozenRows(1);
  SpreadsheetApp.flush();
  return sheet;
}

function staffRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues().map((row, index) => {
    const [revision, action, updatedAt, summary] = row;
    if (revision !== index + 1 || !['initialize', 'save', 'publish', 'restore'].includes(action)) {
      throw new Error('版本表順序不符，請勿直接改動版本表。');
    }
    return { revision, action, updatedAt, summary, row: index + 2 };
  });
}

function readPrivate_(sheet, entry) {
  if (!entry) return null;
  const cells = sheet.getRange(entry.row, 5, 1, STAFF_CHUNKS).getValues()[0];
  return JSON.parse(cells.filter(Boolean).map((cell) => cell.slice(2)).join(''));
}

function staffState_(sheet, rows = staffRows_(sheet)) {
  const last = rows[rows.length - 1];
  const history = rows.filter(({ action }) => action === 'publish').reverse().map(
    ({ revision, updatedAt, summary }) => ({ version: revision, updatedAt, summary })
  );
  return {
    revision: last?.revision || 0,
    draft: readPrivate_(sheet, last),
    draftUpdatedAt: last?.updatedAt || null,
    published: history[0] || null,
    history
  };
}

function snapshotCells_(value) {
  const cells = Array(STAFF_CHUNKS).fill('');
  if (value === null) return cells;
  const json = JSON.stringify(value);
  let start = 0;
  let index = 0;
  while (start < json.length) {
    if (index === STAFF_CHUNKS) throw new Error('版本內容超過儲存容量。');
    let end = Math.min(start + 30000, json.length);
    // A sheet cell must not start or end with half of a Unicode surrogate pair.
    const last = json.charCodeAt(end - 1);
    if (last >= 0xD800 && last <= 0xDBFF) end--;
    cells[index++] = 'j:' + json.slice(start, end);
    start = end;
  }
  return cells;
}

function changeStaff_(action, payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    let sheet = staffSheet_();
    const rows = staffRows_(sheet);
    const last = rows[rows.length - 1];
    if (payload.revision !== (last?.revision || 0)) {
      throw staffConflict_();
    }
    if (action === 'initialize' ? Boolean(last) : !last) {
      throw new Error(action === 'initialize' ? '資料已初始化。' : '請先初始化草稿。');
    }
    let draft;
    let published = null;
    let summary = '';
    if (action === 'restore') {
      const source = rows.find((row) => row.revision === payload.version && row.action === 'publish');
      if (!source) throw new Error('找不到要還原的發布版本。');
      draft = readPrivate_(sheet, source);
      summary = '還原發布版本 v' + source.revision + ' 至草稿';
    } else if (action === 'publish') {
      draft = readPrivate_(sheet, last);
      published = publicStaff_(draft);
      summary = typeof payload.summary === 'string' ? payload.summary.trim().slice(0, 160) : '';
    } else {
      draft = payload.data;
      validateStaff_(draft);
      draft = linkStaffNames_(draft);
    }
    validateStaff_(draft);
    const entry = {
      revision: rows.length + 1, action, updatedAt: new Date().toISOString(),
      summary, row: rows.length + 2
    };
    // Draft and any public projection commit together in the same journal row.
    const record = [
      entry.revision, entry.action, entry.updatedAt, entry.summary ? "'" + entry.summary : '',
      ...snapshotCells_(draft), ...snapshotCells_(published)
    ];
    if (!sheet) sheet = createStaffSheet_();
    if (entry.row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 200);
    sheet.getRange(entry.row, 1, 1, STAFF_WIDTH).setValues([record]);
    SpreadsheetApp.flush();
    return staffState_(sheet, [...rows, entry]);
  } finally {
    lock.releaseLock();
  }
}

function staffConflict_() {
  return new Error('版本衝突：其他管理者已更新資料。請先到進階設定匯出目前修改，再重新讀取最新草稿。');
}
