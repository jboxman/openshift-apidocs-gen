#!/usr/bin/env node

const cli = require('./lib/cli');

async function main() {
  try {
    await cli().start();
  }
  catch(e) {
    console.log(`Unhandled error:\n\n${JSON.stringify(e, null, 2)}`);
    process.exit(1);
  }
}

main();
