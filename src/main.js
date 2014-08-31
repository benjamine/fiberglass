
// global exports

exports.tasks = require('./gulp/loader');

var packageInfo = require('../package' + '.json');
exports.version = packageInfo.version;
exports.homepage = packageInfo.homepage;
