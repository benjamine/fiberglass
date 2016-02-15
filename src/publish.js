var fs = require('fs');
var childProcess = require('child_process');

function publish() {
  if (packageIsPrivate()) {
    console.log('npm publish skipped (private package)');
    return;
  }
  npmPublish();
}

module.exports = publish;

function exec(cmd) {
  childProcess.execSync(cmd, {
    stdio: 'inherit'
  });
}

function packageIsPrivate() {
  return JSON.parse(fs.readFileSync('package.json').toString()).private;
}

function npmPublish() {
  exec('npm publish');
}
