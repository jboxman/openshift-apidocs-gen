// define classes

const $apiGroupValue = Symbol('apiGroup');

class apiGroup {
  constructor(group) {
    this[$apiGroupValue] = group;
  }

  name() {
    return this[$apiGroupValue];
  }

  lessThan(other) {

  	// "apps" group APIs are newer than "extensions" group APIs
    if(this.name() == "apps" && other.name() == "extensions") {
      return true;
    }
    if(other.name() == "extensions" && this.name() == "extensions") {
      return false;
    }

  	// "policy" group APIs are newer than "extensions" group APIs
    if(this.name() == "policy" && other.name() == "extensions") {
      return true;
    }
    if (other.name() == "policy" && this.name() == "extensions") {
      return false;
    }

    // "networking" group APIs are newer than "extensions" group APIs
    if(this.name() == "networking" && other.name() == "extensions") {
      return true;
    }
    if(other.name() == "networking" && this.name() == "extensions") {
      return false;
    }

    // -1 if a < b
  	//return strings.Compare(g.String(), other.String()) < 0
    return this.name() < other.name();
  }
}

module.exports = {
  apiGroup
}
