var path = require('path');
var fs = require('fs');
require('shelljs/global');
/*global config, exec, cd, test, cp, grep */
config.fatal = true;

function publish(){
  var packageInfo = require('../../package');
  cd(path.join(__dirname, '../..'));
  if (packageInfo.repository && test('-d', './pages')) {
    // update/create github page
    if (!test('-d', './gh-pages')) {
      console.log('creating ./gh-pages');
      try {
        exec('git clone --depth 1 ' + packageInfo.repository.url + ' -b gh-pages ./gh-pages');
      } catch (err) {
        exec('git clone --depth 1 ' + packageInfo.repository.url + ' -b master ./gh-pages');
      }
      console.log('./gh-pages folder created');
      cd('./gh-pages');
    } else {
      cd('./gh-pages');
      exec('git pull origin');
    }
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
    cp('-Rf', '../pages/*', './');
    cp('-Rf', '../build/*', './build');
    cp('-Rf', '../test/index.html', './test');
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
    }
  }
}

exports.publish = publish;
