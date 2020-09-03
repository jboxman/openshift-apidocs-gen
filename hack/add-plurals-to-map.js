#!/usr/bin/env node

const program = require('commander');

const fs = require('fs');
const yaml = require('js-yaml');

program
  .arguments('<map_file> <map_plurals_file>')
  .description('')
  .action(main);

function main(mapFile, mapPluralsFile) {

  const map = yaml.safeLoad(fs.readFileSync(mapFile, { encoding: 'utf8' }));
  const plurals = yaml.safeLoad(fs.readFileSync(mapPluralsFile, { encoding: 'utf8' }));

  const getKey = keyName => (lookup, kgv) => {
    const found = lookup.find(v => v.kind == kgv.kind && v.group == kgv.group);
    if(found)
      return found[keyName];

    return null;
  };

  const all = plurals.reduce((accum, group) => {
    accum = [ ...accum, ...group.resources ];
    return accum;
  }, []);

  const obj = map.map(v => ({
    ...v,
    resources: v.resources.reduce((accum, kgv) => {
      const { kind, group, version } = kgv;
      accum.push({ kind, group, version, plural: getKey('plural')(all, kgv), namespaced: getKey('namespaced')(all, kgv) });
      return accum;
    }, [])
  }));

  console.log(yaml.safeDump(obj, { noArrayIndent: true }))
}

program.parse(process.argv);
