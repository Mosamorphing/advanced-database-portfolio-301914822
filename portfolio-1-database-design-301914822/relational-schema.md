# Relational Schema, Keys and Constraints

This document translates the ER model into relations. The names use plural `snake_case` to match the PostgreSQL implementation in [`sql/schema.sql`](./sql/schema.sql).

## Relational schema

The notation `PK`, `FK`, `AK`, `UQ` and `NULL` identifies primary keys, foreign keys, alternate keys, supporting unique constraints and optional attributes respectively.

```text
users(
    user_id PK,
    name,
    email AK,
    created_at,
    updated_at
)

institutions(
    institution_id PK,
    name AK
)

authors(
    author_id PK,
    user_id FK -> users.user_id AK NULL,
    institution_id FK -> institutions.institution_id NULL,
    full_name,
    orcid AK NULL
)

fields(
    field_id PK,
    name AK
)

categories(
    category_id PK,
    field_id FK -> fields.field_id,
    name,
    AK(field_id, name)
)

papers(
    paper_id PK,
    submitted_by_user_id FK -> users.user_id,
    category_id FK -> categories.category_id,
    title,
    abstract,
    document_reference AK,
    status,
    created_at,
    updated_at
)

paper_authors(
    paper_id PK/FK -> papers.paper_id,
    author_id PK/FK -> authors.author_id,
    author_order,
    is_corresponding_author,
    AK(paper_id, author_order)
)

keywords(
    keyword_id PK,
    name AK
)

paper_keywords(
    paper_id PK/FK -> papers.paper_id,
    keyword_id PK/FK -> keywords.keyword_id
)

administrators(
    administrator_id PK,
    name,
    email AK
)

paper_reviews(
    review_id PK,
    paper_id FK -> papers.paper_id,
    reviewer_id FK -> administrators.administrator_id,
    decision,
    reason NULL,
    reviewed_at
)

comments(
    comment_id PK,
    paper_id FK -> papers.paper_id,
    author_user_id FK -> users.user_id,
    parent_comment_id NULL,
    body,
    created_at,
    updated_at,
    UQ(comment_id, paper_id),
    FK(parent_comment_id, paper_id)
        -> comments(comment_id, paper_id)
)
```

## Mapping the ER model to relations

- The one-to-many relationships from `fields` to `categories`, `categories` to `papers`, and `users` to submitted `papers` are implemented with foreign keys on the many side.
- The many-to-many paper-author relationship becomes `paper_authors`. Its composite primary key prevents the same author from being attached to a paper twice.
- The many-to-many paper-keyword relationship becomes `paper_keywords`. Its composite primary key prevents duplicate paper-keyword associations.
- The optional one-to-one user-author relationship is implemented by the nullable, unique `authors.user_id` foreign key. This permits an author to exist without a Nubian Research account while preventing one account from representing multiple author identities.
- Comment replies use a nullable self-reference. The composite reference containing both `parent_comment_id` and `paper_id` ensures that a reply cannot point to a comment belonging to another paper.
- Moderation is represented by `paper_reviews`, allowing a paper to retain more than one review event instead of storing only its most recent reviewer.

## Keys

### Primary keys

Identity-generated numeric primary keys identify the main entities. `paper_authors` and `paper_keywords` use composite primary keys because each row is identified by the pair of entities it connects.

### Foreign keys

Foreign keys preserve the relationships shown in the ER diagram. Paper-owned association, review and comment records are deleted when their paper is deleted. Referenced users, authors, categories and administrators cannot be deleted while operational records still depend on them. Optional author-account and author-institution links are set to `NULL` if the referenced account or institution is removed.

### Alternate keys

Unique constraints define alternate ways of identifying records:

- User and administrator email addresses are unique.
- Institution, field and keyword names are unique.
- An ORCID identifies at most one author when supplied.
- A user account may link to at most one author identity.
- A document reference identifies at most one paper.
- Category names are unique within a field.
- Author positions are unique within a paper.

## Constraints

The PostgreSQL implementation applies the following integrity rules:

- Required attributes use `NOT NULL`.
- Names, titles, abstracts, comments and document references cannot contain only whitespace.
- Paper status is restricted to `pending`, `published` or `rejected`.
- Review decisions are restricted to `approved` or `rejected`.
- A rejected review must include a non-blank reason.
- Author order must be a positive integer and unique within its paper.
- An ORCID, when supplied, must match the standard four-block textual format.
- A comment cannot be its own parent.
- A reply and its parent must belong to the same paper.
- The supporting uniqueness rule on `(comment_id, paper_id)` allows the composite parent reference to enforce that same-paper rule. It is not a separate candidate key because `comment_id` is already unique.
- Updated timestamps cannot precede their corresponding creation timestamps.

Two rules cannot be expressed reliably using ordinary row-level keys and checks alone:

- Every paper must have at least one row in `paper_authors`.
- A paper's current status must agree with the applicable moderation decision.

These rules cross table or transaction boundaries. They require a database transaction or deferred database trigger; Portfolio 3 examines the corresponding transaction and concurrency implications using synthetic assessment operations.

## Deletion behaviour

| Relationship | Action | Reason |
| --- | --- | --- |
| Paper to authors/keywords/reviews/comments | `ON DELETE CASCADE` | Dependent records have no meaning without the paper. |
| User to submitted papers/comments | `ON DELETE RESTRICT` | Authorship and discussion history must not be silently removed. |
| Author to paper credits | `ON DELETE RESTRICT` | Published authorship must be preserved. |
| Field to categories and category to papers | `ON DELETE RESTRICT` | Classification data in active use must not be removed accidentally. |
| Administrator to reviews | `ON DELETE RESTRICT` | Moderation history must retain its reviewer. |
| User or institution to optional author link | `ON DELETE SET NULL` | The author identity remains valid without the platform account or affiliation. |

This is an assessment model for the selected publication domain, not a disclosure of Nubian Research's complete production schema.
