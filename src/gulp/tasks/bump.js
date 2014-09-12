
exports.tags = [];
exports.register = function(gulp, loader){

  var projectRoot = loader.projectRoot;
  require('shelljs/global');
  /*global config, exec, cd */
  config.fatal = true;

  var ghPages = require('../../gh-pages/publisher');

  gulp.task('bump', [], function(callback) {
    var packageInfo = loader.packageInfo();
    cd(projectRoot);
    var remotes = exec('git remote').output.split('\n').filter(function(name){
      return !!name;
    });

    var currentBranch = exec('git rev-parse --abbrev-ref HEAD').output.split('\n')[0];

    var upstreamRemote = remotes.indexOf('upstream') >= 0 ? 'upstream' : 'origin';
    var masterRemote = exec('git config branch.master.remote').output.split('\n')[0];
    if (upstreamRemote !== masterRemote) {
      // this is probably a fork, try to bump upstream
      var upstreamMasterRemote = exec('git config branch.upstream-master.remote').output.split('\n')[0];
      console.log('checking out ' + upstreamMasterRemote + ' master to bump package version');
      if (upstreamMasterRemote) {
        exec('git checkout upstream-master');
      } else {
        exec('git checkout -b upstream-master ' + upstreamRemote + '/master');
      }
    } else {
      console.log('checking out master to bump package version');
      exec('git checkout master');
    }
    console.log('fetching last version');
    exec('git fetch ' + upstreamRemote);
    exec('git rebase ' + upstreamRemote + '/master');

    // version bump
    console.log('version patch');
    exec('npm version patch');

    // test
    console.log('npm test');
    exec('npm test');
    if (exec('git status --porcelain ./build')) {
      // update /build
      exec('git add --all ./build');
      exec('git commit --amend --no-edit');
    }

    ghPages.publish(projectRoot);

    console.log('pushing to origin');
    exec('git push origin');
    exec('git push --tags origin');
    var npmPublish = true;
    if (packageInfo.private) {
      console.log('private package, skipping npm publish');
      npmPublish = false;
    }
    if (!packageInfo.homepage) {
      console.log('no package homepage specified, skipping npm publish');
      npmPublish = false;
    }
    if (npmPublish) {
      console.log('publishing to npm');
      exec('npm publish');
    }

    if (currentBranch !== 'master' && currentBranch !== 'HEAD') {
      console.log('going back to branch ' + currentBranch);
      exec('git checkout ' + currentBranch);
    }

    callback();
  });

};
