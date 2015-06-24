
// global exports

exports.tasks = require('./gulp/loader');
exports.isWatching = require('./gulp/tasks/util/bundler').isWatching;

var packageInfo = require('../package' + '.json');
exports.version = packageInfo.version;
exports.homepage = packageInfo.homepage;
