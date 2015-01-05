
var path = require('path');
var fs = require('fs');
var _ = require('underscore.string');
var browserify = require('browserify');
var minifyify = require('minifyify');
var mold = require('mold-source-map');
var vinylSource = require('vinyl-source-stream');
var vinylBuffer = require('vinyl-buffer');
require('shelljs/global');
/* global exec, config, error */
config.silent = true;
config.fatal = true;

var buildDir = './public/build';

function detectBrowserifyTransforms(projectRoot) {
  // find browserify-transform packages in node_modules (eg: brfs)
  var transform = [];
  var dir = path.join(projectRoot, 'node_modules');
  fs.readdirSync(dir).forEach(function(folder) {
    var filename = path.join(dir, folder, 'package.json');
    if (fs.existsSync(filename)) {
      var moduleInfo = require(filename);
      if (Array.isArray(moduleInfo.keywords) &&
        moduleInfo.keywords.indexOf('browserify-transform') >= 0) {
        transform.push(folder);
      }
    }
  });
  return transform;
}

var allTasks = [];

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

function bundle(gulp, plugins, options) {
  var packageInfo = options.packageInfo;
  var name = options.name || packageInfo.name;
  var taskName = 'bundle-' + name;
  var src = options.src || './src/main.js';
  var minify = options.minify !== false;

  gulp.task(taskName, ['clean'], function(callback) {
    if (fs.existsSync(path.join(buildDir, name+'.js')) &&
      (!minify || fs.existsSync(path.join(buildDir, name+'.min.js')))) {
      console.log(name + ' already exists');
      return;
    }

    var browserifyOptions = options.browserifyOptions || {};
    browserifyOptions.debug = true;

    function bundlify(min){
      var bundler = browserify(browserifyOptions);
      bundler.add(src);
      var fullname = name + (min ? '.min' : '');
      if (min) {
        bundler.plugin(minifyify, {
          map: fullname + '.map',
          output: path.join(buildDir, fullname + '.map'),
          compressPath: function (p) {
            return '/source-files/' + packageInfo.name + '/' + path.relative('.', p);
          }
        });
      }
      var stream = bundler.bundle();
      if (!min) {
        stream = stream.pipe(moldTransformSourcesRelativeToAndPrepend('.',
          '/source-files/' + packageInfo.name + '/'));
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

    var pending = 1;
    function onBundleDone(){
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
  });
  allTasks.push(taskName);
}

function getAllTasks() {
  return allTasks.slice();
}

function auto(loader) {
  var gulp = loader.gulp;
  var plugins = loader.plugins;
  var packageInfo = loader.packageInfo();

  var detectedTransforms = detectBrowserifyTransforms(loader.projectRoot);

  if (detectedTransforms && detectedTransforms.length) {
    console.log('browserifying with transforms: ' + detectedTransforms.join(', '));
  }

  // main bundle
  bundle(gulp, plugins, {
    browserifyOptions: {
      name: packageInfo.name,
      standalone: _.camelize(packageInfo.name),
      transform: detectedTransforms
    },
    packageInfo: packageInfo
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
          transform: detectedTransforms
        },
        packageInfo: packageInfo
      });
    }
  });

  bundle(gulp, plugins, {
    name: 'test-bundle',
    src: './test/index.js',
    minify: false,
    packageInfo: packageInfo,
    browserifyOptions: {
      transform: detectedTransforms
    }
  });

  var tasks = getAllTasks();
  var mochaFolder = path.join(__dirname, '../../../../node_modules/mocha');
  var testBuildDir = path.join(buildDir, 'test');
  gulp.task('copy-test-resources', ['clean'], function() {
    gulp.src(path.join(mochaFolder, 'mocha.js'))
      .pipe(gulp.dest(testBuildDir));
    gulp.src(path.join(mochaFolder, 'mocha.css'))
      .pipe(gulp.dest(testBuildDir));
  });
  tasks.push('copy-test-resources');

  if (fs.existsSync(path.join(loader.projectRoot, 'bower.json' ))) {
    gulp.task('copy-bower-json', ['clean'], function() {
      gulp.src('bower.json')
        .pipe(plugins.replace(/public\/build\//g, ''))
        .pipe(gulp.dest(buildDir));
    });
    tasks.push('copy-bower-json');
  }

  if (loader.bundleTasks) {
    tasks.push.apply(tasks, loader.bundleTasks);
  }

  gulp.task('bundle', tasks, function(){
  });

}

exports.bundle = bundle;
exports.getAllTasks = getAllTasks;
exports.auto = auto;
