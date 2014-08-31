
exports.tags = [];
exports.register = function(){

  var gulp = require('gulp');
  var rimraf = require('rimraf');

  gulp.task('clean', function(callback) {
    rimraf('./build', callback);
  });

};
