
exports.tags = [];
exports.register = function(gulp, loader){

  var plugins = loader.plugins;
  var plumber = require('./util/plumber').plumber;

  gulp.task('lint', function() {
    return gulp.src([
        'gulpfile.js',
        './src/**/*.js',
        './test/**/*.js'
      ])
      .pipe(plumber(loader))
      .pipe(plugins.jshint())
      .pipe(plugins.jshint.reporter('jshint-stylish'))
      .pipe(plugins.jshint.reporter('fail'))
      .pipe(plumber(loader));
  });

};
