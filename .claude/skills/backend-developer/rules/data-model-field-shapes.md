---
title: Define a model's field shapes in settings.json
impact: CRITICAL
impactDescription: settings.json is validated as a whole before any backend MCP/CLI command runs. A malformed field anywhere — wrong/missing type attribute, dangling ref, model without dbType/dbName — blocks generation for every model in the file, not just the broken one.
tags: data, model, settings, fields, schema, mongodb, sqlserver
---

# Define a model's field shapes in settings.json

## Why it matters

Before `generate_model`/`generate_models` (or the equivalent CLI commands) can
write a model's layered files (model, repository, interface, contract, route,
controller, service), the model must already exist as an object under
`settings.json` → `apps[<app>].models.<modelName>`. You define that object by
hand — there is no tool that builds it for you (see `proc-mcp-scaffolding`).
`validateSettings()` checks the **entire** `settings.json` before running any
backend command, so one malformed field blocks generation project-wide, not
just for the model you're editing.

## Field type reference

| `type` | Required extra keys | Notes |
| --- | --- | --- |
| `String`, `Number`, `Boolean`, `Date`, `Dateonly` | — | Primitives. `Date` is a full datetime; `Dateonly` is a calendar date with no time component. A field meant to hold an uploaded file's name is still plain `String` — see `data-file-fields` for the env-var wiring that actually makes it an upload. |
| `Array` | `contentType` | The type of each element: a primitive name, `"Object"`, or `"ObjectId"`. |
| `Array` + `contentType: "Object"` | `structure` | Same field rules apply recursively inside `structure`. |
| `Array` + `contentType: "ObjectId"` | `ref` | `ref` is the **key name** of another model in the same app's `models` map (not its `collectionName`). |
| `Object` | `structure` | An object of fields, same rules recursively (can nest arbitrarily deep). |
| `ObjectId` | `ref` | Same `ref` rule as above — must name an existing sibling model. |
| any `Array`/primitive | `enum` (optional) | Restricts allowed values; works alongside `contentType` on arrays too. |

Model-level keys (sibling of `fields`):

| Key | Required when | Notes |
| --- | --- | --- |
| `dbType` | always, once `generated: true` | One of `mongodb`, `postgresql`, `mysql`, `sqlserver`, `sqlite`. |
| `dbName` | always, once `generated: true` | Logical database name; also drives the generated `*_DATABASE_*` env vars. |
| `collectionName` | recommended for `mongodb` | The actual Mongo collection name; this is what gets pluralized/used on disk, while `ref` still points at the model **key**, e.g. `data_model` ↔ collection `data_models`. |
| `generated` | set by the CLI | `true` once `generate_model` has run for it; you don't need to set it by hand before generating. |

## Incorrect Example

Missing the extra key each type requires, and a `ref` pointing at a model that
doesn't exist in the same app.

```jsonc
// ❌ Array without contentType
"numbers": { "type": "Array" }

// ❌ Object without structure
"nested_object": { "type": "Object" }

// ❌ ObjectId without ref
"sub_data_model": { "type": "ObjectId" }

// ❌ ref names a model that isn't defined anywhere in this app's `models`
"sub_data_model": { "type": "ObjectId", "ref": "supplier" }

// ❌ generated: true but no dbType/dbName — validateSettings() rejects the whole file
"data_model": {
  "fields": { "text": { "type": "String" } },
  "generated": true
}
```

## Correct Example

Two real, related models from a generated `backend/settings.json`:
`sub_data_model` is the simple referenced model, and `data_model` references it
(both as a single `ObjectId` and as an array of them), plus shows every nesting
pattern (`Object` inside `Object`, `Array` of `Object`, `Array` of `Object`
inside an `Array` of `Object`).

```jsonc
{
  "name": "backend",
  "apps": [
    {
      "name": "api",
      "type": "api-rest",
      "port": 3000,
      "environmentVariables": [],
      "models": {
        // ✅ Referenced model defined first (order doesn't matter to the
        // validator, but it must exist somewhere in this app's `models`).
        "sub_data_model": {
          "fields": {
            "name": { "type": "String" }
          },
          "dbType": "mongodb",
          "dbName": "testing",
          "collectionName": "sub_data_models",
          "generated": true
        },

        "data_model": {
          "fields": {
            // primitives
            "text": { "type": "String" },
            "amount": { "type": "Number" },
            "active": { "type": "Boolean" },
            "birthdate": { "type": "Dateonly" },
            "arrival": { "type": "Date" },

            // array of a primitive
            "numbers": { "type": "Array", "contentType": "Number" },

            // array of a primitive, restricted to a set of values
            "limited_numbers": {
              "type": "Array",
              "contentType": "Number",
              "enum": [3, 6, 9]
            },

            // single relation — ref names the sibling model's key, "sub_data_model"
            "sub_data_model": { "type": "ObjectId", "ref": "sub_data_model" },

            // array of relations — same ref, contentType: "ObjectId"
            "sub_data_models": {
              "type": "Array",
              "contentType": "ObjectId",
              "ref": "sub_data_model"
            },

            // nested object — fields inside `structure` follow the same rules,
            // including their own relations and enums
            "nested_object": {
              "type": "Object",
              "structure": {
                "text": { "type": "String" },
                "amount": { "type": "Number" },
                "checkIn": { "type": "Date" },
                "sub_data_model": { "type": "ObjectId", "ref": "sub_data_model" },
                "sub_data_models": {
                  "type": "Array",
                  "contentType": "ObjectId",
                  "ref": "sub_data_model"
                },
                "nested_numbers": {
                  "type": "Array",
                  "contentType": "Number",
                  "enum": [2, 4, 8]
                }
              }
            },

            // nesting can go arbitrarily deep: Object inside Object
            "second_nested": {
              "type": "Object",
              "structure": {
                "name": { "type": "String" },
                "age": { "type": "Number" },
                "sub_nested": {
                  "type": "Object",
                  "structure": {
                    "nested_name": { "type": "String" },
                    "sub_data_model": { "type": "ObjectId", "ref": "sub_data_model" }
                  }
                }
              }
            },

            // array of objects — contentType: "Object" + structure, and that
            // structure can itself contain another array of objects
            "object_list": {
              "type": "Array",
              "contentType": "Object",
              "structure": {
                "nickname": { "type": "String" },
                "event_date": { "type": "Dateonly" },
                "sub_data_model": { "type": "ObjectId", "ref": "sub_data_model" },
                "sub_object_list": {
                  "type": "Array",
                  "contentType": "Object",
                  "structure": {
                    "my_date": { "type": "Dateonly" },
                    "my_datetime": { "type": "Date" }
                  }
                }
              }
            }
          },
          "dbType": "mongodb",
          "dbName": "testing",
          "collectionName": "data_models",
          "generated": true
        }
      }
    }
  ]
}
```

Once this is in place, call `generate_model('data_model', 'api')` /
`generate_model('sub_data_model', 'api')` (or `generate_models('api')` for
both at once) to materialize the layered files.

## Key Rules

1. **Match each `type` to its required extra key:** `Array` → `contentType`;
   `Object` (or `Array` of `Object`) → `structure`; `ObjectId` (or `Array` of
   `ObjectId`) → `ref`.
2. **`ref` is always a model key name**, never a `collectionName` or a free
   string — the target model must exist in the same app's `models` map.
3. **Nesting is recursive and unlimited:** any field inside a `structure` can
   itself be an `Object`, an `Array` of `Object`, a relation, or an enum-array,
   exactly like a top-level field.
4. **Set `dbType` + `dbName`** on every model before marking/generating it —
   `validateSettings()` requires both once `generated: true`, and it validates
   the whole file, so a missing one anywhere blocks every other model too.
5. **Define the field shape yourself, by hand** — `generate_model` only reads
   this object and writes files for it; it never infers or creates the shape.
