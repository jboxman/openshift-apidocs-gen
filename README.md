# OpenShift OpenAPI reference documentation generator

This tool generates documentation for the
[OpenShift](https://www.openshift.com/) OpenAPI specification for a running a
cluster. The APIs included in the OpenAPI spec file are specific to the cluster
from which the spec originates.

(If you want to immediately access the [OpenShift API reference
documentation](https://docs.openshift.com/container-platform/4.9/rest_api/index.html),
it is available as part of the official [OpenShift Container
Platform](https://docs.openshift.com) documentation.)

## Configuration format

The configuration supports the following keys.
Only uncommented keys are supported in the current release.

```yaml
version: 2
outputDir: build
#apisToHide: []
apiMap: []
```

The `apiMap` key specifies an array of nested objects defining OpenShift APIs,
with each object describing a related set of APIs.

Every key is required.

The values for the keys `kind`, `group`, and `version` are found in the output
of `oc api-resources` on recent versions of OpenShift based on Kubernetes v1.20.
For 'core' APIs, such as the Pod API, no group is specified as the group
internally is empty.

```yaml
- name: Authorization APIs
  resources:
  - kind: LocalResourceAccessReview
    group: authorization.openshift.io
    version: v1
- name: Autoscale APIs
  resources:
  - kind: ClusterAutoscaler
    group: autoscaling.openshift.io
    version: v1
```

## How to install

This tool is written in JavaScript and depends on Node.js to run.

*Prerequisites*

* [NodeJS](https://nodejs.org/en/) >= 12

*Procedure*

```
npm i -g @jboxman/openshift-apidocs-gen
```

## CLI help

A list of commands and expected parameters is available from the tool itself:

```
openshift-apidocs-gen --help
Usage: openshift-apidocs-gen [options] [command]

Options:
  -h, --help                          display help for command

Commands:
  build [options] <oApiSpecFile>      Build the AsciiDoc source for the OpenShift API reference documentation
  topic-map [options]                 Output YAML to stdout suitable for inclusion in an AsciiBinder _topic_map.yml file
  changelog [options] <oApiSpecFile>  Output a changelog to stdout for an `apiMap`
  create-resources <oApiSpecFile>     Output an `apiMap` array in YAML to stdout
  help [command]                      display help for command
  ```

## Typical usage

The following procedure reflects typical usage. For each new release of
OpenShift, the `apiMap` must be adjusted accordingly as APIs are added and API
versions incremented, or APIs are dropped.

*Prerequisites*

* [Asciidoctor](https://asciidoctor.org)
* `jq` [binary](https://stedolan.github.io/jq/)

*Procedure*

1. Log in to an OpenShift cluster with `cluster-admin` privileges.

1. Run `oc get --raw /openapi/v2 | jq . > openapi.json`.

1. Create an empty configuration:

   ```
   echo "version: 2
   outputDir: build
   apisToHide: []
   apiMap:" > config.yaml
   ```

1. Generate an API map:

   ```
   openshift-apidocs-gen create-resources openapi.json >> config.yaml
   ```

1. Generate the API docs:

   ```
   openshift-apidocs-gen build -c config.yaml openapi.json
   ```

1. Build the HTML documentation, such as with the following command:

   ```
   find build -type f -name '*.adoc' | xargs -L1 -I^ -P1 asciidoctor -a toc -d book ^
   ```

## Known issues

For known issues, refer to
[GitHub](https://github.com/jboxman/openshift-apidocs-gen/issues).
