
var gutil = require('gulp-util');
var plugins = require('gulp-load-plugins')();

var enabled = false;

exports.enable = function enable(){
  enabled = true;
};

exports.plumber = function plumber() {
  return enabled ? plugins.plumber() : gutil.noop();
};
