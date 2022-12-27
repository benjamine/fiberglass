const path = require('node:path');
const bulk = require('bulk-require');

class GulpTaskLoader {
  constructor (gulp, projectRoot) {
    this.projectRoot = projectRoot;
    this.gulp = gulp;
    this.options = {};
    this.plugins = require('gulp-load-plugins')({
      config: path.join(__dirname, '../../package.json'),
      lazy: true
    });
    this.tasks = bulk(__dirname + '/tasks', '*.js');
    this.bundleTasks = [];
    this.bundleDependencies = [];
    this.tags = {};

    Object.keys(this.tasks).forEach((taskName) => {
      var task = this.tasks[taskName];

      if (!task.tags) {
        return;
      }

      task.tags.forEach(tag => {
        if (!this.tags[tag]) {
          this.tags[tag] = [];
        }
        if (this.tags[tag].indexOf(task) < 0) {
          this.tags[tag].push(task);
        }
      });
    });
  }

  get (...args) {
    args = args.filter(arg => typeof arg === 'string' && arg.length > 0)
    var self = this;
    var tasks = [];

    var include = [];
    var exclude = [];
    args.forEach(function (arg) {
      if (arg.indexOf('!') === 0) {
        exclude.push(arg.substr(1));
      } else {
        include.push(arg);
      }
    });

    var filterByTags = function (tags) {
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

    Object.keys(this.tasks).forEach(function (taskName) {
      var task = self.tasks[taskName];
      if (args.indexOf(taskName) >= 0) {
        tasks.push(task);
        return;
      }
      if (filterByTags(task.tags)) {
        tasks.push(task);
      }
    });

    return tasks;
  }

  register (...args) {
    const tasks = this.get(...args);

    tasks.forEach(task => {
      task.register(this.gulp, this);
    });
  }

  setOptions (options) {
    if (options) {
      this.options = options;
    }
    return this;
  }

  addBundleTasks (...args) {
    this.bundleTasks.push(...args);
    return this;
  }

  addBundleDependencies (...args) {
    this.bundleDependencies.push(...args);
    return this;
  }

  packageInfo () {
    return require(path.join(this.projectRoot, 'package.json'));
  }
}

module.exports = function createGulpTaskLoder(gulp, projectRoot) {
  return new GulpTaskLoader(gulp, projectRoot);
};
