
var gutil = require('gulp-util');
var enabled = false;

exports.enable = function enable(){
  enabled = true;
};

exports.plumber = function plumber(loader) {
  return enabled ? loader.plugins.plumber() : gutil.noop();
};
