# OpenShift OpenAPI reference documentation generator

This tool generates documentation for the [OpenShift](https://www.openshift.com/) OpenAPI specification for a running a cluster.
The APIs included in the OpenAPI spec file are specific to the cluster from which the spec originates.

(If you want to immediately access the [OpenShift API reference documentation](https://docs.openshift.com/container-platform/4.9/rest_api/index.html), it is available as part of the official [OpenShift Container Platform](https://docs.openshift.com) documentation.)

## Configuration format

The configuration supports the following keys.
Only uncommented keys are supported in the current release.

```yaml
version: 2
outputDir: build
#apisToHide: []
#apiSupportLevels: {}
#packageMap: {}
apiMap: []
```

The `apiMap` key specifies an array of nested objects defining OpenShift APIs,
with each object describing a related set of APIs.

Every key is required.

The values for the keys `kind`, `group`, and `version` are found in the output of `oc api-resources` on recent versions of OpenShift based on Kubernetes v1.20.

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

This tool is written in JavaScript and depends on Node.JS to run.

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
  -h, --help                             display help for command

Commands:
  build [options] <oapiSpecFile>         Build the Asciidoc source for the OpenShift API reference documentation
  topic-map [resource_map]               Output YAML to stdout suitable for inclusion in an AsciiBinder _topic_map.yml file
  changelog [options] [oapiSpecFile]     Output a changelog to stdout for a specified resource map
  verify-rules [options] [oapiSpecFile]  Output a list of API resources in an OpenShift OpenAPI spec file
  help [command]                         display help for command
```

## Typical usage

The following procedure reflects typical usage. For each new release of OpenShift, the `apiMap` must be adjusted accordingly as APIs are added and API versions increment, or APIs are dropped.

*Prerequisites*

* [Asciidoctor](https://asciidoctor.org) (either Ruby or JavaScript build)
* `jq` [binary](https://stedolan.github.io/jq/)

*Procedure*

1. Log in to an OpenShift cluster with `cluster-admin` privileges.

1. Run `oc get --raw /openapi/v2 | jq . > /tmp/openshift-openapi-<version>-<yyyymmdd>.json`.

1. Run `oc api-resources > /tmp/api-resources-<version>-<yyyymmdd>.txt`.

1. Confirm that no package matching rules are missing:

   ```
   openshift-apidocs-gen verify-rules -q /tmp/<openshift_apis>.json
   ```

   Currently, if a new rule is necessary, this software needs to be updated before the API documentation can be generated. Otherwise, the API documentation related to the missing rules cannot be generated.

1. Generate an API map:

   ```
   hack/create-resources.js /tmp/<api_resources>.txt /tmp/<openshift_apis>.json > /tmp/map.yaml
   ```

1. Create a configuration file and populate the `apiMap` key with the YAML from `map.yaml` generated in the previous step.

   A legacy mode supports using the YAML as-is, without the `version: v2` configuration keys, but support for this may be deprecated and removed in the future.

1. Generate the API docs:

   ```
   openshift-apidocs-gen build --map <config>.yaml /tmp/<openshift_apis>.json
   ```

1. Build the HTML documentation, such as with the following command:

   ```
   find build -type f -name '*.adoc' | xargs -L1 -I^ -P1 asciidoctor -a toc -d book ^
   ```

## Known issues

For known issues, refer to [GitHub](https://github.com/jboxman/openshift-apidocs-gen/issues).
