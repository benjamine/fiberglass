
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var plumber = require('./util/plumber').plumber;

gulp.task('lint', function() {
  return gulp.src([
      'gulpfile.js',
      './gulp-tasks/**/*.js',
      './src/**/*.js',
      './test/**/*.js'
    ])
    .pipe(plumber())
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(plugins.jshint.reporter('fail'))
    .pipe(plumber());
});
