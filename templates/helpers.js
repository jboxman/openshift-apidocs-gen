
const escapeMarkup = (text = '') => {
  return text.replace(/[|]/g, '\\|');
};

const flatPropertiesForTable = flatProps => {
  return Object.entries(flatProps)
    .reduce((a, e) => a.concat([ { property: e[0], ...e[1] } ]), []);
};

const createFindDefinitionByKey = config => key => {
  switch (typeof(key)) {
    case 'string':
        return config.definitions.all()[key];
      break;

    case 'object':
        return config.definitions.getByVersionKind(key);
      break;

    default:
       return {};
      break;
  }
};

module.exports = {
  escapeMarkup,
  flatPropertiesForTable,
  createFindDefinitionByKey
};
