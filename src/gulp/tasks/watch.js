
exports.tags = [];
exports.register = function(gulp){

  var gutil = require('gulp-util');

  gulp.task('watch', ['test'], function() {
    require('./util/plumber').enable();
    return gulp.watch([
      'src/**',
      'test/**'
      ], ['test']).on('error', gutil.log);
  });

};
