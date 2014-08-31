
exports.tags = [];
exports.register = function(gulp){

  var taskFilter = /(^build\-)|(^copy\-test\-resources$)/;

  gulp.task('help', function(callback) {
    console.log('Usage:');
    console.log('  gulp <task>');
    console.log('');

		var tasks = Object.keys(gulp.tasks).sort();
    tasks = tasks.filter(function(name) {
      return !taskFilter.test(name);
    });

		console.log('Tasks');
    console.log('=====');

		tasks.forEach(function(name) {
			console.log('    '+name);
		});

		console.log('');
    callback();
  });

};
