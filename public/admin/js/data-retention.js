(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AdminDataRetention = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function purgeReadOlderThan(collections, days, now) {
    var safeDays = Number(days);
    if (!Number.isFinite(safeDays) || safeDays < 1) throw new Error('Prazo de retenção inválido.');
    var reference = now instanceof Date ? now.getTime() : Date.now();
    var cutoff = reference - safeDays * 24 * 60 * 60 * 1000;
    var output = {};
    var removed = {};
    var totalRemoved = 0;

    Object.keys(collections || {}).forEach(function (key) {
      var list = Array.isArray(collections[key]) ? collections[key] : [];
      removed[key] = 0;
      output[key] = list.filter(function (item) {
        var timestamp = Date.parse(item && item.criadoEm);
        var shouldRemove = item && item.lida === true && Number.isFinite(timestamp) && timestamp < cutoff;
        if (shouldRemove) {
          removed[key] += 1;
          totalRemoved += 1;
        }
        return !shouldRemove;
      });
    });

    return { collections: output, removed: removed, totalRemoved: totalRemoved };
  }

  return { purgeReadOlderThan: purgeReadOlderThan };
});
