
exports.tags = ['browser-only'];
exports.register = function(gulp, loader){

  var bundler = require('./util/bundler');
  bundler.auto(loader);

};
