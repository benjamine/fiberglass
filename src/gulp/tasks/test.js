
exports.tags = [];
exports.register = function(gulp, loader){

  var plugins = loader.plugins;
  var plumber = require('./util/plumber').plumber;

  gulp.task('test', ['lint'], function () {
    return gulp.src('./test/index.js')
      .pipe(plumber(loader))
      .pipe(plugins.mocha({
        grep: process.env.FILTER || undefined,
        reporter: 'spec',
        growl: true
      }))
      .pipe(plumber(loader));
  });
};
