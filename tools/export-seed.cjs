const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const baseline = require("../data.js");

const schemaPath = path.join(__dirname, "../apps-script/admin/Schema.gs");
const { validateStaff_, linkStaffNames_ } = vm.runInNewContext(
  fs.readFileSync(schemaPath, "utf8") + "\n({ validateStaff_, linkStaffNames_ });"
);
const seed = { ...baseline, sections: {}, privateNotes: "" };
validateStaff_(seed);
const draft = linkStaffNames_(seed);
validateStaff_(draft);
process.stdout.write(JSON.stringify({ data: draft }, null, 2) + "\n");
