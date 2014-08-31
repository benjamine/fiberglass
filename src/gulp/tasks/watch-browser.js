
exports.tags = ['browser-only'];
exports.register = function(){

  var gulp = require('gulp');
  var gutil = require('gulp-util');

  gulp.task('watch-browser', ['test', 'test-browser'], function() {
    require('./util/plumber').enable();
    return gulp.watch([
      'src/**',
      'test/**'
      ], ['test']).on('error', gutil.log);
  });

};
