'use strict';

function write(level, event, fields) {
  var entry = Object.assign(
    { timestamp: new Date().toISOString(), level: level, event: event },
    fields || {}
  );
  var line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function error(event, err, fields) {
  var safe = Object.assign({}, fields || {});
  safe.error = err && err.message ? String(err.message).slice(0, 500) : String(err || 'erro');
  write('error', event, safe);
}

module.exports = {
  info: function (event, fields) { write('info', event, fields); },
  warn: function (event, fields) { write('warn', event, fields); },
  error: error
};
