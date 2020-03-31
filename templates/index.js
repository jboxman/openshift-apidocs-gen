const tmpl = require('handlebars');

// TODO -
// Need to either resursively descend dependsOn
// or link to an index of all related definitions

const assemblyTemplate = tmpl.compile(`
{{#each .}}
= {{name}}

{{#each resources}}
== {{name}} {{version}} {{group}}

{{#with (findDefinitionByKey definition)}}

[NOTE]
====
.Appears in
{{#each appearsIn}}
{{#with (findDefinitionByKey .)}}
* {{kind}} [{{group}}/{{version}}]
{{/with}}
{{/each}}
====

=== Definitions

==== {{name}} [{{version}}/{{group}}]

The following table describes the parameters for the {{name}} object:

[cols="1,1,1",options="header"]
|===
| Field | Type | Description
{{#each fields}}
| \`{{name}}\`
| {{type}}
| {{{shorter description}}}
{{/each}}
|===

{{#each inlineDefs}}
{{#with (findDefinitionByKey .)}}
==== {{kind}} [{{version}}/{{group}}]

The following table describes the parameters for {{kind}} object:

[cols="1,1,1",options="header"]
|===
| Field | Type | Description
{{#each fields}}
| \`{{name}}\`
| {{type}}
| {{{shorter description}}}
{{/each}}
|===
{{/with}}
{{/each}}

{{#with (withoutInline (descendDependsOn key2) inlineDefs)}}
{{#each .}}
{{#with (findDefinitionByKey .)}}
==== {{kind}} [{{version}}/{{group}}]

The following table describes the parameters for {{kind}} object:

[cols="1,1,1",options="header"]
|===
| Field | Type | Description
{{#each fields}}
| \`{{name}}\`
| {{type}}
| {{{shorter description}}}
{{/each}}
|===
{{/with}}
{{/each}}
{{/with}}

=== Operations

{{#each operationCategories}}
==== {{name}}

{{#each operations}}

===== {{operationTypeName}}
{{{description}}}

.HTTP request
\`{{httpMethod}}\` \`{{path}}\`

{{#if bodyParams}}
.HTTP body
[cols="1,1",options="header"]
|===
| Object | Type
{{#each bodyParams}}
| \`{{name}}\`
| {{type}}
{{/each}}
|===
{{/if}}

{{#if pathParams}}
.Path parameters
[cols="1,1",options="header"]
|===
| Parameter | Description
{{#each pathParams}}
| \`{{name}}\`
| {{{shorter description}}}
{{/each}}
|===
{{/if}}

{{#if queryParams}}
.Query parameters
[cols="1,1",options="header"]
|===
| Parameter | Description
{{#each queryParams}}
| \`{{name}}\`
| {{{shorter description}}}
{{/each}}
|===
{{/if}}

{{#if httpResponses}}
.HTTP responses
[cols="1,1",options="header"]
|===
| Code | Type
{{#each httpResponses}}
| {{code}} - {{{description}}}
| {{type}}
{{/each}}
|===
{{/if}}

{{/each}}

{{/each}}

{{/with}}

{{/each}}

{{/each}}
`);

module.exports = {
  assemblyTemplate
};
