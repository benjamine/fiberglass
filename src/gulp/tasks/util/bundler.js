
var path = require('path');
var fs = require('fs');
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var _ = require('underscore.string');

var packageInfo = require('../../package.json');

function detectBrowserifyTransforms() {
  // find browserify-transform packages in node_modules
  var transform = [];
  var dir = path.join(__dirname, '../../node_modules');
  fs.readdirSync(dir).forEach(function(folder) {
    if (fs.existsSync(path.join(dir, folder, 'package.json'))) {
      var filename = '../../node_modules/' + folder + '/package.json';
      var moduleInfo = require(filename);
      if (Array.isArray(moduleInfo.keywords) &&
        moduleInfo.keywords.indexOf('browserify-transform') > 0) {
        transform.push(folder);
      }
    }
  });
  return transform;
}

var detectedBrowserifyTransforms = detectBrowserifyTransforms();

var allTasks = [];

function bundle(options) {
  var name = options.name || packageInfo.name;
  var taskName = 'build-' + name;
  var src = options.src || 'src/main.js';
  var minify = options.minify !== false;
  gulp.task(taskName, ['clean'], function() {
    if (fs.existsSync(path.join(__dirname, '../../build/'+name+'.js')) &&
      (!minify || fs.existsSync(path.join(__dirname, '../../build/'+name+'.min.js')))) {
      console.log(name + ' already exists');
      return;
    }

    var browserifyOptions = options.browserifyOptions || {};
    browserifyOptions.transform = browserifyOptions.transform ||
      detectedBrowserifyTransforms;

    var stream = gulp.src(src)
      .pipe(plugins.replace('{{package-version}}', packageInfo.version))
      .pipe(plugins.replace('{{package-homepage}}', packageInfo.homepage))
      .pipe(plugins.browserify(browserifyOptions))
      .pipe(plugins.rename(name+'.js'))
      .pipe(gulp.dest('./build'));
    if (!minify) { return stream; }
    return stream.pipe(plugins.uglify())
      .pipe(plugins.rename(name+'.min.js'))
      .pipe(gulp.dest('./build'));
  });
  allTasks.push(taskName);
}

function getAllTasks() {
  return allTasks.slice();
}

function auto() {

  // main bundle
  bundle({
    browserifyOptions: {
      name: packageInfo.name,
      standalone: _.camelize(packageInfo.name),
    }
  });

  // find additional bundles as: /src/main-{{bundle-name}}.js
  fs.readdirSync(path.join(__dirname, '../../src')).forEach(function(filename) {
    if (/main\-.+\.js/.test(filename)) {
      var name = /main\-(.+)\.js/.exec(filename)[1];
      // identify if it's an alternative bundle, (to be used instead main bundle)
      // or a sub-bundle (an optional addition to main bundle)
      var alternative = /^(alt|full|with|plus|no\-)/.test(name);
      var standalone = _.camelize(packageInfo.name);
      if (!alternative) {
        standalone += '.' + _.camelize(name);
      }
      bundle({
        name: packageInfo.name + '-' + name,
        src: 'src/' + filename,
        browserifyOptions: {
          standalone: standalone,
        }
      });
    }
  });

  bundle({
    name: 'test-bundle',
    src: 'test/index.js',
    minify: false
  });

  var tasks = getAllTasks();

  gulp.task('copy-test-resources', ['clean'], function() {
    gulp.src('node_modules/mocha/mocha.js')
      .pipe(gulp.dest('build/test'));
    gulp.src('node_modules/mocha/mocha.css')
      .pipe(gulp.dest('build/test'));
  });
  tasks.push('copy-test-resources');

  if (fs.existsSync(path.join(__dirname, '../../bower.json' ))) {
    gulp.task('copy-bower-json', ['clean'], function() {
      gulp.src('bower.json')
        .pipe(plugins.replace(/build\//g, ''))
        .pipe(gulp.dest('build'));
    });
    tasks.push('copy-bower-json');
  }

  gulp.task('bundle', tasks, function(){
  });

}

exports.bundle = bundle;
exports.getAllTasks = getAllTasks;
exports.auto = auto;
