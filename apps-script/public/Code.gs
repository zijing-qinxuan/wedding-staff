// This project has only the read-only Sheets scope. It never reads draft columns.
function doGet(event) {
  const callback = event?.parameter?.callback;
  const validCallback = typeof callback === 'string' && /^weddingStaffRead_[a-f0-9]{32}$/.test(callback);
  let payload = { ok: false, error: '目前無法取得已發布資料。' };
  if (callback === undefined || validCallback) {
    try {
      const id = PropertiesService.getScriptProperties().getProperty('STAFF_SHEET_ID');
      const tab = "'婚禮工作版本'";
      const rows = Sheets.Spreadsheets.Values.get(id, tab + '!A2:C', { valueRenderOption: 'UNFORMATTED_VALUE' }).values || [];
      let index = rows.length - 1;
      while (index >= 0 && rows[index][1] !== 'publish') index--;
      if (index !== -1) {
        const [version, , updatedAt] = rows[index];
        const row = index + 2;
        const cells = Sheets.Spreadsheets.Values.get(id, tab + '!Q' + row + ':AB' + row, {
          valueRenderOption: 'UNFORMATTED_VALUE'
        }).values?.[0] || [];
        if (!cells.length || !cells.every((cell) => typeof cell === 'string' && cell.startsWith('j:'))) {
          throw new Error('Published record is missing.');
        }
        payload = {
          ok: true, kind: 'wedding-staff-published', version, updatedAt,
          data: JSON.parse(cells.map((cell) => cell.slice(2)).join(''))
        };
      }
    } catch (_) {
      // All public failures have the same response. Never return spreadsheet details.
    }
  }
  const json = JSON.stringify(payload).replace(/[<\u2028\u2029]/g, (character) =>
    '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0')
  );
  if (validCallback) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
