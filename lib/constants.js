const patchStrategyKey = "x-kubernetes-patch-strategy";
const patchMergeKeyKey = "x-kubernetes-patch-merge-key";
const typeKey = "x-kubernetes-group-version-kind";
// This does not exist anywhere in the k8s OpenAPI spec file
const resourceNameKey = "x-kubernetes-resource";

module.exports = {
  patchStrategyKey,
  patchMergeKeyKey,
  resourceNameKey,
  typeKey
}
