var path = require('path');
var fs = require('fs');
require('shelljs/global');
/*global config, exec, cd, test, cp, grep */
config.fatal = true;

function publish(projectRoot){

  var packageInfo = require(path.join(projectRoot, 'package.json'));
  cd(projectRoot);
  var branchIsNew = false;
  if (packageInfo.repository && test('-d', './pages')) {
    // update/create github page
    if (!test('-d', './gh-pages')) {
      console.log('creating ./gh-pages');

      config.fatal = false;
      exec('git clone --depth 1 ' + packageInfo.repository.url + ' -b gh-pages ./gh-pages');
      config.fatal = true;

      if (!test('-d', './gh-pages')) {
        branchIsNew = true;
        console.log('gh-pages not found at remote, creating from scratch');
        exec('git clone --depth 1 ' + packageInfo.repository.url + ' -b master ./gh-pages');
      }
      console.log('./gh-pages folder created');
    }
    cd('./gh-pages');
    if (exec('git symbolic-ref --short HEAD').output !== 'gh-pages\n') {
      if (!(exec('git branch --list gh-pages').output ||
        exec('git branch --list -r origin/gh-pages').output)) {
        console.log('creating gh-pages branch');
        exec('git checkout --orphan gh-pages');
        exec('git reset --hard');
      } else {
        console.log('checking out gh-pages');
        exec('git checkout gh-pages');
      }
    }
    if (!branchIsNew) {
      console.log('updating gh-pages folder');
      exec('git fetch origin gh-pages');
      exec('git merge origin gh-pages');
    }

    console.log('copying files to gh-pages');
    cp('-Rf', '../public/*', './');

    if (exec('git status --porcelain .').output) {
      console.log('updating gh-pages');
      exec('git add --all .');
      exec('git commit --no-edit -m "version bump"');
      exec('git push origin');
    }
    cd('..');
    if (!grep('gh-pages', '.gitignore')) {
      console.log('adding gh-pages to .gitignore');
      fs.appendFileSync('.gitignore', '\ngh-pages');
      exec('git add .gitignore');
      exec('git commit --no-edit -m "adds gh-pages to gitignore"');
      console.log('.gitignore patched');
    }
  }
}

exports.publish = publish;
