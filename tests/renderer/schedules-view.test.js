const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", "..", relativePath), "utf8");
}

module.exports = async function schedulesViewTests() {
  const empty = read("src/renderer/views/schedules-empty-view.js");
  const list = read("src/renderer/views/schedules-list-view.js");
  const view = read("src/renderer/views/schedules-view.js");
  const shell = read("src/renderer/views/shell-view.js");

  assert.match(empty, /renderSchedulesEmpty/);
  assert.match(empty, /No hay tareas/);

  assert.match(list, /renderSchedulesList/);
  assert.match(list, /state\.schedules/);
  assert.match(list, /toggle-schedule/);
  assert.match(list, /remove-schedule/);

  assert.match(view, /renderSchedulesView/);
  assert.match(view, /renderSchedulesList/);
  assert.match(view, /toggle-schedule-add/);

  assert.doesNotMatch(shell, /"schedules"/);
};
