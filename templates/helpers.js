
const escapeMarkup = (text = '') => {
  // TODO - Fix escape rule
  const t = text.replace(/[|]/g, '%');
  //console.log(t);
  return t;
};

const flatPropertiesForTable = flatProps => {
  return Object.entries(flatProps)
    .reduce((a, e) => a.concat([ { property: e[0], ...e[1] } ]), []);
};

module.exports = {
  escapeMarkup,
  flatPropertiesForTable
};
