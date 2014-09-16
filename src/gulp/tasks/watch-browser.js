
exports.tags = ['browser-only'];
exports.register = function(gulp){

  var gutil = require('gulp-util');

  gulp.task('watch-browser', ['test-browser'], function() {
    require('./util/plumber').enable();
    return gulp.watch([
      'src/**',
      'test/**'
      ], ['test-browser']).on('error', gutil.log);
  });

};
