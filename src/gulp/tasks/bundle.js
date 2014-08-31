
exports.tags = ['browser-only'];
exports.register = function(){

  var bundler = require('./util/bundler');
  bundler.auto();

};
