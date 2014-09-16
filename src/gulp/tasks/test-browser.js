var karma = require('karma').server;
var path = require('path');

exports.tags = ['browser-only'];
exports.register = function(gulp, loader){

  var browsers = process.env.BROWSERS || process.env.BROWSER || 'PhantomJS';
  browsers = browsers ? browsers.split(' ') : undefined;

  gulp.task('test-browser', ['bundle'], function(done) {
    karma.start({
      configFile: path.join(loader.projectRoot, 'karma.conf.js'),
      browsers: browsers,
      singleRun: true
    }, done);
  });

};
