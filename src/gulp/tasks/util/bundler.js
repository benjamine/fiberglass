
var path = require('path');
var fs = require('fs');
var _ = require('underscore.string');
var browserify = require('browserify');
var watchify = require('watchify');
var minifyify = require('minifyify');
var mold = require('mold-source-map');
var vinylSource = require('vinyl-source-stream');
var vinylBuffer = require('vinyl-buffer');
var buildDir = './public/build';
var watchBundles = false;
// this modules (transforms or plugins) will only be enabled when watching
var watchOnlyModules = [ 'errorify' ];
function isWatching(){
  return watchBundles;
}

require('shelljs/global');
/* global exec, config */
config.silent = true;
config.fatal = true;

function detectBrowserifyModules(projectRoot) {
  // find browserify-transform and browserify-plugin packages in node_modules (eg: brfs)
  var transform = [];
  var plugin = [];
  var dir = path.join(projectRoot, 'node_modules');
  fs.readdirSync(dir).forEach(function(folder) {
    var filename = path.join(dir, folder, 'package.json');
    if (fs.existsSync(filename)) {
      var moduleInfo = require(filename);
      if (Array.isArray(moduleInfo.keywords)) {
        if (!watchBundles && watchOnlyModules.indexOf(folder) >= 0) {
          return;
        }
        if (moduleInfo.keywords.indexOf('browserify-transform') >= 0) {
          transform.push(folder);
        }
        if (moduleInfo.keywords.indexOf('browserify-plugin') >= 0) {
          plugin.push(folder);
        }
      }
    }
  });
  return {
    transform: transform,
    plugin: plugin,
    count: transform.length + plugin.length
  };
}

var allTasks = [];
var allWatchTasks = [];

function moldTransformSourcesRelativeToAndPrepend(root, prefix) {
  return mold.transformSources(function map(file){
    return prefix + path.relative(root, file);
  });
}

var gitVersion = null;
function getGitVersion() {
  if (gitVersion) {
    return gitVersion;
  }
  gitVersion = _.trim(exec('git rev-parse --short HEAD').output || '');
  return gitVersion;
}

function bundleHasAngular(src) {
  var angular = false;
  if (fs.existsSync(path.join(src, '..', 'app/ng-loader.js'))) {
    angular = true;
  }
  if (!angular && fs.existsSync(path.join(src, '..', '.jshintrc'))) {
    var jshintrc = fs.readFileSync(path.join(src, '..', '.jshintrc')).toString();
    angular = /angular/.test(jshintrc);
  }
  if (angular) {
    console.log('minifying with angular support (// @ngInject)');
  }
  return angular;
}

function bundle(gulp, plugins, options) {
  var packageInfo = options.packageInfo;
  var name = options.name || packageInfo.name;
  var taskName = 'bundle-' + name;
  var src = options.src || './src/main.js';
  var minify = options.minify !== false;

  function bundleTask(callback) {

    var browserifyOptions = options.browserifyOptions || {};
    browserifyOptions.debug = true;

    function bundlify(min) {
      if (watchBundles) {
        browserifyOptions.cache = {};
        browserifyOptions.packageCache = {};
        browserifyOptions.fullPaths = true;
      }
      var bundler = browserify(browserifyOptions);
      var fullname = name + (min ? '.min' : '');

      function createBundle() {
        var stream = bundler.bundle();
        if (!min && !watchBundles) {
          // make all sourcemap paths relative to the bundle location
          stream = stream.pipe(moldTransformSourcesRelativeToAndPrepend('.', ''));
        }
        var replaceOptions = {
          skipBinary: true
        };

        stream = stream
        .pipe(vinylSource(fullname + '.js'))
        .pipe(vinylBuffer())

        .pipe(plugins.replace('{{package-version}}', packageInfo.version, replaceOptions))
        .pipe(plugins.replace('{{package-homepage}}', packageInfo.homepage, replaceOptions))
        .pipe(plugins.replace('{{git-version}}', getGitVersion, replaceOptions))

        .pipe(gulp.dest(buildDir));
        return stream;
      }

      if (watchBundles) {
        // if watch is enabled, wrap this bundler with watchify
        bundler = watchify(bundler);
        bundler.on('update', function() {
          var startTime = new Date();
          console.log('rebuilding...');
          var rebuildStream = createBundle();
          var listeners = bundler.listeners("reset").filter(l => l.name === "addHooks");
          for (var i = 0; i < listeners.length - 1; i++) { //remove "reset" listeners except last
            bundler.removeListener('reset', listeners[i]);
          }
          rebuildStream.on('end', function() {
            var elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 10) / 100;
            console.log(fullname + '.js rebuilt (after ' + elapsed + ' s)');
          });
        });
      }

      bundler.add(src);
      if (min) {
        var uglifyOptions = {
          compress: {
            angular: bundleHasAngular(src, options)
          }
        };
        bundler.plugin(minifyify, {
          map: fullname + '.map',
          uglify: uglifyOptions,
          output: path.join(buildDir, fullname + '.map'),
          compressPath: function (p) {
            return '/source-files/' + packageInfo.name + '/' + path.relative('.', p);
          }
        });
      }

      return createBundle();
    }

    var pending = 1;
    function onBundleDone() {
      pending--;
      if (pending > 0) {
        return;
      }
      callback();
    }
    bundlify().on('end', onBundleDone);

    if (!minify) {
      return;
    }
    pending++;
    bundlify(true).on('end', onBundleDone);
  }

  var bundleDependencies = options.loader.bundleDependencies || [];
  if (bundleDependencies.indexOf('clean') < 0) {
    bundleDependencies.push('clean');
  }
  console.log('task',taskName, bundleDependencies);
  gulp.task(taskName, bundleDependencies, bundleTask);
  gulp.task(taskName + '-watch', bundleDependencies, function(callback) {
    watchBundles = true;
    return bundleTask(callback);
  });
  allTasks.push(taskName);
  allWatchTasks.push(taskName + '-watch');
}

function getAllTasks() {
  return allTasks.slice();
}

function getAllWatchTasks() {
  return allWatchTasks.slice();
}

function auto(loader) {
  var gulp = loader.gulp;
  var plugins = loader.plugins;
  var packageInfo = loader.packageInfo();
  var loaderOptions = loader.options;
  var browserifyModules = detectBrowserifyModules(loader.projectRoot);

  if (browserifyModules.count) {
    console.log('browserifying with ' + browserifyModules.plugin.concat(browserifyModules.transform).join(', '));
  }

  var browserifyOptions = loaderOptions.browserify || {};
  browserifyOptions.name = packageInfo.name;
  browserifyOptions.standalone = _.camelize(packageInfo.name);
  browserifyOptions.transform = browserifyOptions.transform || browserifyModules.transform;
  browserifyOptions.plugin = browserifyOptions.plugin || browserifyModules.plugin;

  // main bundle
  bundle(gulp, plugins, {
    browserifyOptions: browserifyOptions,
    packageInfo: packageInfo,
    loader: loader
  });

  // find additional bundles as: /src/main-{{bundle-name}}.js
  fs.readdirSync(path.join(loader.projectRoot, 'src')).forEach(function(filename) {
    if (/main\-.+\.js/.test(filename)) {
      var name = /main\-(.+)\.js/.exec(filename)[1];
      // identify if it's an alternative bundle, (to be used instead main bundle)
      // or a sub-bundle (an optional addition to main bundle)
      var alternative = /^(alt|full|with|plus|no\-)/.test(name);
      var standalone = _.camelize(packageInfo.name);
      if (!alternative) {
        standalone += '.' + _.camelize(name);
      }
      bundle(gulp, plugins, {
        name: packageInfo.name + '-' + name,
        src: './src/' + filename,
        browserifyOptions: {
          standalone: standalone,
          transform: browserifyModules.transform,
          plugin: browserifyModules.plugin
        },
        packageInfo: packageInfo,
        loader: loader
      });
    }
  });

  if (!loaderOptions.noBrowserTesting) {
    bundle(gulp, plugins, {
      name: 'test-bundle',
      src: './test/index.js',
      minify: false,
      packageInfo: packageInfo,
      browserifyOptions: {
        transform: browserifyModules.transform,
        plugin: browserifyModules.plugin
      },
      loader: loader
    });
  }

  var tasks = getAllTasks();
  var watchTasks = getAllWatchTasks();

  if (!loaderOptions.noBrowserTesting) {
    var mochaFolder = path.join(__dirname, '../../../../node_modules/mocha');
    var testBuildDir = path.join(buildDir, 'test');
    gulp.task('copy-test-resources', ['clean'], function() {
      gulp.src(path.join(mochaFolder, 'mocha.js'))
        .pipe(gulp.dest(testBuildDir));
      gulp.src(path.join(mochaFolder, 'mocha.css'))
        .pipe(gulp.dest(testBuildDir));
    });
    tasks.push('copy-test-resources');
    watchTasks.push('copy-test-resources');
  }

  if (fs.existsSync(path.join(loader.projectRoot, 'bower.json' ))) {
    gulp.task('copy-bower-json', ['clean'], function() {
      gulp.src('bower.json')
        .pipe(plugins.replace(/public\/build\//g, ''))
        .pipe(gulp.dest(buildDir));
    });
    tasks.push('copy-bower-json');
    watchTasks.push('copy-bower-json');
  }

  if (loader.bundleTasks) {
    tasks.push.apply(tasks, loader.bundleTasks);
    watchTasks.push.apply(watchTasks, loader.bundleTasks);
  }

  gulp.task('bundle', tasks, function() {
  });

  gulp.task('bundle-watch', watchTasks, function() {
  });
}

exports.bundle = bundle;
exports.getAllTasks = getAllTasks;
exports.auto = auto;
exports.isWatching = isWatching;
