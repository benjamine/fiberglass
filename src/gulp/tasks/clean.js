var path = require('path');

exports.tags = [];
exports.register = function(gulp, loader){

  var rimraf = require('rimraf');

  gulp.task('clean', function(callback) {
    rimraf(path.join(loader.projectRoot, 'build'), callback);
  });

};
