const fs = require('fs').promises; // TODO - experimental API
const dir = require('node-dir');
const path = require('path');

const partialsDir = path.join(__dirname, 'partials');
const pagesDir = path.join(__dirname, 'pages');
const tmplRegex = /\.hbs$/i;

const toCamel = filename =>
  filename
    .split('-')
    .map((part, idx) => idx == 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

async function registerPartials(Handlebars) {
  const templateFiles = await dir.promiseFiles(partialsDir)
    .then(function(files) {
      return files
        .filter(file => tmplRegex.test(file))
        .reduce((dict, filename) => {
          return {
            ...dict,
            ...{ [toCamel(path.basename(filename, '.hbs'))]: filename }
          }
        }, {});
    });

  for(const [ partialName, partialFilename ] of Object.entries(templateFiles)) {
    let partial = '';
    try {
      partial = await fs.readFile(partialFilename, { encoding: 'utf8' });
    }
    catch(e) { console.log(e); }

    Handlebars.registerPartial(partialName, partial);
  }
}

async function compilePage(Handlebars, pageFile='index') {
  let page = '';
  try {
    page = await fs.readFile(path.join(pagesDir, `${pageFile}.hbs`), { encoding: 'utf8' });
  }
  catch(e) { console.log(e); }

  return Handlebars.compile(page);
}

module.exports = {
  registerPartials,
  compilePage
};
