#!/usr/bin/env node

const loadApiSpec = require('../lib/openapi');

const spec = loadApiSpec(process.argv[2]);

/*
Gather every schema that might be a resource.
Some definitions with this key are not resources, such as DeleteOptions.
This must be compared with every resource referenced by an API endpoint.
The basis for this comparison is always the values from `x-kubernetes-group-version-kind`.

There is also a list resource for every API:
"kind": "HorizontalPodAutoscalerList",

com.github.openshift.api.apps.v1.DeploymentConfig 2
com.github.openshift.api.apps.v1.DeploymentConfigList 2
com.github.openshift.api.apps.v1.DeploymentConfigRollback 2
com.github.openshift.api.apps.v1.DeploymentLog 2
com.github.openshift.api.apps.v1.DeploymentRequest 2
com.github.openshift.api.authorization.v1.ClusterRole 2
com.github.openshift.api.authorization.v1.ClusterRoleBinding 2
com.github.openshift.api.authorization.v1.ClusterRoleBindingList 2
com.github.openshift.api.authorization.v1.ClusterRoleList 2
com.github.openshift.api.authorization.v1.LocalResourceAccessReview 2
com.github.openshift.api.authorization.v1.LocalSubjectAccessReview 2
com.github.openshift.api.authorization.v1.ResourceAccessReview 2
com.github.openshift.api.authorization.v1.Role 2
com.github.openshift.api.authorization.v1.RoleBinding 2
com.github.openshift.api.authorization.v1.RoleBindingList 2
com.github.openshift.api.authorization.v1.RoleList 2
com.github.openshift.api.authorization.v1.SelfSubjectRulesReview 2
com.github.openshift.api.authorization.v1.SubjectAccessReview 2
com.github.openshift.api.authorization.v1.SubjectRulesReview 2
com.github.openshift.api.build.v1.Build 2
com.github.openshift.api.build.v1.BuildConfig 2
com.github.openshift.api.build.v1.BuildConfigList 2
com.github.openshift.api.build.v1.BuildList 2
com.github.openshift.api.build.v1.BuildLog 2
com.github.openshift.api.build.v1.BuildRequest 2
com.github.openshift.api.image.v1.Image 2
com.github.openshift.api.image.v1.ImageList 2
com.github.openshift.api.image.v1.ImageSignature 2
com.github.openshift.api.image.v1.ImageStream 2
com.github.openshift.api.image.v1.ImageStreamImage 2
com.github.openshift.api.image.v1.ImageStreamImport 2
com.github.openshift.api.image.v1.ImageStreamList 2
com.github.openshift.api.image.v1.ImageStreamMapping 2
com.github.openshift.api.image.v1.ImageStreamTag 2
com.github.openshift.api.image.v1.ImageStreamTagList 2
com.github.openshift.api.project.v1.Project 2
com.github.openshift.api.project.v1.ProjectList 2
com.github.openshift.api.project.v1.ProjectRequest 2
com.github.openshift.api.quota.v1.AppliedClusterResourceQuota 2
com.github.openshift.api.quota.v1.AppliedClusterResourceQuotaList 2
com.github.openshift.api.route.v1.Route 2
com.github.openshift.api.route.v1.RouteList 2
com.github.openshift.api.security.v1.PodSecurityPolicyReview 2
com.github.openshift.api.security.v1.PodSecurityPolicySelfSubjectReview 2
com.github.openshift.api.security.v1.PodSecurityPolicySubjectReview 2
com.github.openshift.api.template.v1.Template 4
com.github.openshift.api.template.v1.TemplateList 2
io.k8s.api.extensions.v1beta1.Scale 2
io.k8s.apimachinery.pkg.apis.meta.v1.DeleteOptions 61
io.k8s.apimachinery.pkg.apis.meta.v1.WatchEvent 61
*/

const defs = Object.entries(spec['definitions']).reduce((accum, [ id, spec ]) => {
  const kgvs = spec['x-kubernetes-group-version-kind'] || [];
  if(kgvs.length <= 0) return accum;

  for(const kgv of kgvs) {
    const { kind, group, version } = kgv;
    accum[`${kind}:${group}:${version}`] = id;
  }
  return accum;
}, {});

/*
Gather every API endpoint.
Every API endpoint that includes the `x-kubernetes-group-version-kind` key relates
to a resource schema. These must be compared with every schema, because some API endpoints
refer to a KGV that does not exist:

PodAttachOptions::v1
PodExecOptions::v1
PodPortForwardOptions::v1
PodProxyOptions::v1
ServiceProxyOptions::v1
NodeProxyOptions::v1
BinaryBuildRequestOptions:build.openshift.io:v1
*/

const apis = Object.entries(spec['paths']).reduce((ops, [ path, opts ]) => {
  const verbs = Object.entries(opts).reduce((accum, [ verb, params ]) => {
    if(params.hasOwnProperty('x-kubernetes-group-version-kind')) {
      let { kind, group, version } = params['x-kubernetes-group-version-kind'];
      let obj;
      //if(!group)
      //  group = 'core';

      obj = {
        id: `${kind}:${group}:${version}`,
        path,
        verb,
        kind,
        group,
        version,
        action: params['x-kubernetes-action'],
        params: { ...params }
      }
      accum.push(obj);
    }

    //if(verb != 'parameters')
    //  console.warn(`${path} ${verb} ${params.operationId}`);

    return accum;
  }, []);

  for(const verb of verbs) {
    const { id } = verb;
    if(! ops.has(id)) {
      ops.set(id, []);
    }

    ops.set(id, ops.get(id).concat(verb));
  }
  return ops;
}, new Map());

for(const [ k, array ] of apis.entries()) {
  if(!defs[k]) console.log(k);
  if(!defs[k]) apis.delete(k);
  //console.log(`Found API endpoints for ${k}`);
  for(const v of array) {
    console.log(`${v.path} ${v.kind} ${v.group} ${v.version} ${v.params.operationId}`);
  }
}
