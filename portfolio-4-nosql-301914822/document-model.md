# MongoDB Document Model

## Scope

This model reorganises selected entities from the Portfolio 1 relational design into two MongoDB collections: `papers` and `comments`. It supports the paper-discovery and discussion access patterns defined in the Portfolio 4 README.

It is an independent academic model built with synthetic data. It is not a complete conversion of the relational schema, a production migration plan, or a representation of Nubian Research's internal architecture.

## Model overview

```text
papers
├── paper details
├── classification
│   ├── field
│   └── category
├── authors[]
│   └── institution
└── keywords[]

comments
├── paperId ──────────────> papers._id
├── author
└── parentCommentId ──────> comments._id or null
```

The arrows represent manual references stored as `ObjectId` values. MongoDB does not enforce them as foreign keys.

## Access patterns and design response

| Access pattern | Model decision |
| --- | --- |
| Retrieve one paper with its classification, authors and keywords | Embed those bounded values in the paper document. |
| Find published papers by category or keyword | Store stable category and keyword identifiers in searchable nested fields and add compound indexes. |
| Update one paper | Keep the paper and its display metadata in one document so the individual document update is atomic. |
| Retrieve and paginate comments for a paper | Store comments separately and index them by `paperId` and `createdAt`. |
| Retrieve replies to a comment | Store a nullable `parentCommentId` rather than embedding an indefinitely deep reply tree. |
| Count published papers by research field | Aggregate on the embedded field identifier and name. |

## `papers` collection

One document represents one research paper and the bounded descriptive data normally displayed with it.

| Field | BSON type | Purpose |
| --- | --- | --- |
| `_id` | ObjectId | Unique paper identifier. |
| `documentReference` | String | Unique reference to the externally stored document. The PDF itself is not embedded. |
| `submittedByUserId` | ObjectId | Logical identifier of the submitting user. |
| `title` | String | Paper title. |
| `abstract` | String | Paper abstract. |
| `status` | String | Current state: `pending`, `published` or `rejected`. |
| `classification` | Object | Embedded research field and category. |
| `authors` | Array | Ordered author-credit snapshots. Array position preserves author order. |
| `keywords` | Array | Embedded keyword summaries. |
| `submittedAt` | Date | Submission timestamp, corresponding to `created_at` in Portfolio 1. |
| `updatedAt` | Date | Most recent update timestamp. |

### Representative paper document

The example uses `mongosh` notation so that the BSON `ObjectId` and `Date` values are visible. All identifiers are fixed synthetic values; the explicit date fields, rather than timestamps encoded in manually assigned `_id` values, represent event times.

```javascript
{
  _id: ObjectId("660000000000000000000001"),
  documentReference: "portfolio4/papers/synthetic-paper-001.pdf",
  submittedByUserId: ObjectId("660000000000000000000101"),
  title: "A Synthetic Study of Open Research Metadata",
  abstract: "Fictional content created only for the Portfolio 4 document-model demonstration.",
  status: "published",
  classification: {
    field: {
      fieldId: ObjectId("660000000000000000000401"),
      name: "Computing"
    },
    category: {
      categoryId: ObjectId("660000000000000000000501"),
      name: "Database Systems"
    }
  },
  authors: [
    {
      authorId: ObjectId("660000000000000000000201"),
      userId: ObjectId("660000000000000000000101"),
      fullName: "Ada Example",
      orcid: null,
      institution: {
        institutionId: ObjectId("660000000000000000000301"),
        name: "Synthetic Research Institute"
      },
      isCorrespondingAuthor: true
    },
    {
      authorId: ObjectId("660000000000000000000202"),
      userId: null,
      fullName: "Bola Example",
      orcid: null,
      institution: null,
      isCorrespondingAuthor: false
    }
  ],
  keywords: [
    {
      keywordId: ObjectId("660000000000000000000601"),
      name: "Open Access"
    },
    {
      keywordId: ObjectId("660000000000000000000602"),
      name: "Document Databases"
    }
  ],
  submittedAt: ISODate("2026-01-15T10:00:00Z"),
  updatedAt: ISODate("2026-01-16T09:30:00Z")
}
```

The first item in `authors` is the first credited author and the second item is the second credited author. This uses the ordering already preserved by a BSON array instead of duplicating an `authorOrder` value inside every item.

## `comments` collection

Comments are stored separately because their number is unpredictable, they are written independently, and they need to be paginated without loading the paper document. Replies use a manual self-reference rather than recursive embedding.

| Field | BSON type | Purpose |
| --- | --- | --- |
| `_id` | ObjectId | Unique comment identifier. |
| `paperId` | ObjectId | Manual reference to the related paper. |
| `author` | Object | Embedded user identifier and display-name snapshot. |
| `parentCommentId` | ObjectId or Null | Manual reference to the parent comment; `null` identifies a top-level comment. |
| `body` | String | Comment content. |
| `createdAt` | Date | Creation timestamp. |
| `updatedAt` | Date | Most recent update timestamp. |

### Representative top-level comment

```javascript
{
  _id: ObjectId("660000000000000000000701"),
  paperId: ObjectId("660000000000000000000001"),
  author: {
    userId: ObjectId("660000000000000000000102"),
    displayName: "Synthetic Reader"
  },
  parentCommentId: null,
  body: "A fictional top-level comment for the document-model demonstration.",
  createdAt: ISODate("2026-01-17T10:00:00Z"),
  updatedAt: ISODate("2026-01-17T10:00:00Z")
}
```

### Representative reply

```javascript
{
  _id: ObjectId("660000000000000000000702"),
  paperId: ObjectId("660000000000000000000001"),
  author: {
    userId: ObjectId("660000000000000000000101"),
    displayName: "Synthetic Researcher"
  },
  parentCommentId: ObjectId("660000000000000000000701"),
  body: "A fictional reply linked to the first comment.",
  createdAt: ISODate("2026-01-17T11:00:00Z"),
  updatedAt: ISODate("2026-01-17T11:00:00Z")
}
```

Embedding the display name makes a comment immediately readable without another collection lookup. It also creates a snapshot: if a user later changes their display name, existing comment documents do not change automatically.

## Relational-to-document mapping

| Portfolio 1 relation | Portfolio 4 representation |
| --- | --- |
| `papers` | Root fields of each `papers` document. |
| `fields` and `categories` | Embedded `classification.field` and `classification.category` objects. |
| `paper_authors`, `authors` and `institutions` | Ordered embedded `authors` array with optional institution snapshots. |
| `paper_keywords` and `keywords` | Embedded `keywords` array. |
| `users` | Logical user identifiers and only the display snapshots required by this model. |
| `comments` | Separate `comments` collection using `paperId` and `parentCommentId`. |
| `administrators` and `paper_reviews` | Outside this discovery-focused document model. Only the paper's current `status` is retained. |

This mapping is selective. It remodels the part of the case study needed for the declared access patterns rather than copying every relational table into a MongoDB collection.

## Embedding and referencing decisions

### Embedded data

Classification, author credits, institutions and keywords are expected to remain modest in size and are normally read with the paper. Embedding them makes a paper document self-contained and avoids reconstruction through joins or MongoDB `$lookup` stages for the primary paper-detail query.

The embedded values are snapshots. Author names, institution names, classification names and keyword names can therefore be duplicated across multiple paper documents.

### Referenced data

Comments are referenced through `paperId` because their number can grow independently of the paper. Keeping them separate:

- prevents an unbounded comments array from continually enlarging the paper document;
- avoids rewriting the paper document for every new comment;
- supports independent comment pagination and indexing;
- avoids approaching MongoDB's 16 MiB document-size limit as a discussion grows.

Replies remain flat in the same collection and use `parentCommentId`. This avoids an indefinitely deep nested reply structure.

## Planned indexes

The implementation will create only indexes tied to the declared access patterns:

| Collection | Index keys | Reason |
| --- | --- | --- |
| `papers` | `{ documentReference: 1 }`, unique | Prevent duplicate document references. |
| `papers` | `{ status: 1, "classification.category.categoryId": 1, submittedAt: -1 }` | Retrieve recent published papers in a category. |
| `papers` | `{ "keywords.keywordId": 1, status: 1 }` | Retrieve published papers associated with a keyword. This becomes a multikey index because `keywords` is an array. |
| `comments` | `{ paperId: 1, createdAt: 1 }` | Retrieve a paper's comments in chronological order. |
| `comments` | `{ paperId: 1, parentCommentId: 1, createdAt: 1 }` | Retrieve the replies to a selected comment in chronological order. |

## Validation and consistency boundaries

MongoDB `$jsonSchema` validation will enforce required fields, BSON types, non-empty strings, allowed status values and at least one author per paper. Requiring one author is a rule of this Portfolio 4 model rather than a constraint already enforced by the Portfolio 1 schema.

For continuity, the validator will retain the relevant Portfolio 1 length limits for document references, titles, names and keywords. A non-null ORCID will retain the Portfolio 1 format. `parentCommentId` will be required but nullable so every comment explicitly identifies itself as either top-level or a reply.

Document validation cannot provide all the relational guarantees from Portfolio 1. In particular, it cannot by itself ensure that:

- a referenced `paperId` exists;
- `parentCommentId` identifies an existing comment on the same paper;
- a comment does not identify itself as its parent;
- embedded author and keyword identifiers are unique within their arrays;
- `updatedAt` is not earlier than `submittedAt` or `createdAt`;
- duplicated author, institution, category or keyword names agree across every paper.

The Portfolio 1 schema did not require exactly one corresponding author, so this model does not present that as an inherited rule. Each author item must contain a Boolean `isCorrespondingAuthor` value, while the seeded examples will identify one corresponding author.

The deterministic seed and validation scripts will check the cross-document and date assumptions needed by this assessment. A real application would need to enforce the remaining rules in its write logic. Identifiers for users, authors, institutions, fields, categories and keywords are logical, type-checked values in this deliberately two-collection model; MongoDB does not verify them against separate master collections.

## Suitability and limitations

The model is suitable for paper-centred discovery because the information needed to display a paper is stored together and can be retrieved in one document read. MongoDB also represents ordered author arrays and nested classification data naturally.

The design is less suitable when shared reference data changes frequently or strict cross-record integrity is the main concern. Renaming an institution, category or keyword may require updating multiple paper documents, and those documents may temporarily disagree. Separate comments also require a separate query or a `$lookup` stage when a paper and its discussion are displayed together; they are not returned by the simple single-document paper read.

The Portfolio 1 relational model remains preferable for operations that depend on normalised shared data, foreign keys, and complex transactions across several entities. This document model demonstrates a different trade-off; it does not establish that one database model is universally superior.
