var requireDir = require('require-dir');

function GulpTaskLoader(){
  this.tasks = requireDir('./tasks');
  var self = this;
  this.tags = {};
  Object.keys(this.tasks).forEach(function(taskName) {
    var task = self.tasks[taskName];
    if (!task.tags) {
      return;
    }
    task.tags.forEach(function(tag){
      if (!self.tags[tag]) {
        self.tags[tag] = [];
      }
      if (self.tags[tag].indexOf(task) < 0) {
        self.tags[tag].push(task);
      }
    });
  });
}

GulpTaskLoader.prototype.get = function() {
  var args = Array.prototype.slice.apply(args);
  var self = this;
  var tasks = [];

  var include = [];
  var exclude = [];
  args.forEach(function(arg){
    if (arg.indexOf('!') === 0){
      exclude.push(arg.substr(1));
    } else {
      include.push(arg);
    }
  });

  var filterByTags = function(tags) {
    var hasIncludedTag = false;
    if (tags) {
      for (var i = tags.length - 1; i >= 0; i--) {
        var tag = tags[i];
        if (exclude.indexOf(tag) >= 0) {
          return false;
        }
        if (include.indexOf(tag) >= 0) {
          hasIncludedTag = true;
        }
      }
    }
    return (hasIncludedTag || include.length === 0);
  };

  Object.keys(this.tasks).forEach(function(taskName) {
    var task = self.tasks[taskName];
    if (args.indexOf(taskName) >= 0){
      tasks.push(task);
      return;
    }
    if (filterByTags(task.tags)) {
      tasks.push(task);
    }
  });

  return tasks;
};

GulpTaskLoader.prototype.register = function() {
  var tasks = this.get.apply(this, arguments);
  tasks.forEach(function(task){
    task.register();
  });
};

module.exports = new GulpTaskLoader();
