#!/usr/bin/env node

var fiberglass = require('../src/main');

if (process.argv[2] === 'publish') {
  fiberglass.publish();
  return;
}

console.log('USAGE:\n  fiberglass publish -- npm publish unless package is private');
