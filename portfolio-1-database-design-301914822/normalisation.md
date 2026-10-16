# Normalisation Explanation

## Purpose

Normalisation organises data so that each fact is stored in an appropriate relation and unnecessary duplication is reduced. This helps prevent insertion, update and deletion anomalies. The Nubian Research model is normalised by starting with a hypothetical paper-submission record and progressively applying the first 3 normal forms.

## Unnormalised form

A paper submission could initially be represented as one large record:

```text
RESEARCH_SUBMISSION(
    paper_id,
    title,
    abstract,
    document_reference,
    status,
    submitter_id,
    submitter_name,
    submitter_email,
    category_id,
    category_name,
    field_id,
    field_name,
    authors[
        author_id,
        full_name,
        orcid,
        institution_id,
        institution_name,
        author_order,
        is_corresponding_author
    ],
    keywords[keyword_id, keyword_name],
    reviews[
        review_id,
        reviewer_id,
        reviewer_name,
        decision,
        reason,
        reviewed_at
    ],
    comments[
        comment_id,
        comment_author_id,
        parent_comment_id,
        body,
        created_at
    ]
)
```

The arrays represent repeating groups. A paper may have several authors, keywords, reviews and comments. Storing them in one record would make individual values difficult to query and would repeat paper, user and classification details.

This design would cause several anomalies:

- **Update anomaly:** Renaming an institution, field or keyword would require the same fact to be updated in many paper records.
- **Insertion anomaly:** A new keyword or category could not be recorded until a paper used it.
- **Deletion anomaly:** Deleting the only paper associated with a keyword or author could accidentally remove the only stored description of that entity.

## First Normal Form (1NF)

A relation is in 1NF when each attribute contains a single atomic value and repeating groups have been removed.

The repeating authors, keywords, reviews and comments are separated from the paper data:

```text
PAPER_1NF(
    paper_id,
    title,
    abstract,
    document_reference,
    status,
    submitter_id,
    submitter_name,
    submitter_email,
    category_id,
    category_name,
    field_id,
    field_name
)

PAPER_AUTHOR_1NF(
    paper_id,
    author_id,
    full_name,
    orcid,
    institution_id,
    institution_name,
    author_order,
    is_corresponding_author
)

PAPER_KEYWORD_1NF(paper_id, keyword_id, keyword_name)

PAPER_REVIEW_1NF(
    review_id,
    paper_id,
    reviewer_id,
    reviewer_name,
    reviewer_email,
    decision,
    reason,
    reviewed_at
)

COMMENT_1NF(
    comment_id,
    paper_id,
    comment_author_id,
    comment_author_name,
    parent_comment_id,
    body,
    created_at,
    updated_at
)
```

Each cell now holds one value, and each repeating item occupies its own row. However, some non-key attributes still depend on only part of a composite key.

## Second Normal Form (2NF)

A relation is in 2NF when it is in 1NF and every non-key attribute depends on the whole primary key, not only part of a composite key.

`PAPER_AUTHOR_1NF` is identified by `(paper_id, author_id)`, but the author's name, ORCID and institution depend only on `author_id`. Those attributes are moved into `authors`. Only facts about an author's participation in a particular paper remain in `paper_authors`:

```text
authors(author_id, user_id, institution_id, full_name, orcid)

paper_authors(
    paper_id,
    author_id,
    author_order,
    is_corresponding_author
)
```

Similarly, `keyword_name` depends only on `keyword_id`, not on the complete `(paper_id, keyword_id)` key. It is separated as follows:

```text
keywords(keyword_id, name)

paper_keywords(paper_id, keyword_id)
```

Relations with a single-attribute primary key have no partial-key dependency and therefore satisfy 2NF once they satisfy 1NF.

## Third Normal Form (3NF)

A relation is in 3NF when it is in 2NF and its non-key attributes do not depend transitively on its primary key through another non-key attribute.

Several transitive dependencies remain in the first-normal-form relations:

```text
paper_id -> submitter_id -> submitter_name, submitter_email
paper_id -> category_id -> category_name, field_id
category_id -> field_id -> field_name
author_id -> institution_id -> institution_name
review_id -> reviewer_id -> reviewer_name, reviewer_email
comment_id -> comment_author_id -> comment_author_name
```

These dependencies are removed by creating separate relations for users, institutions, fields, categories and administrators. The dependent relations retain only the appropriate foreign keys.

The resulting 3NF relations are:

```text
users
institutions
authors
fields
categories
papers
paper_authors
keywords
paper_keywords
administrators
paper_reviews
comments
```

Examples of facts now stored only once include:

- A user's name and email are stored in `users`, while papers and comments reference the user key.
- An institution's name is stored in `institutions`, while authors reference the institution key.
- A field's name is stored in `fields`, while categories reference the field key.
- A keyword's name is stored in `keywords`, while papers are connected through `paper_keywords`.
- An administrator's identity is stored in `administrators`, while reviews reference the administrator key.

## Principal functional dependencies

The final design is based on the following principal dependencies:

```text
user_id -> name, email, created_at, updated_at
institution_id -> name
author_id -> user_id, institution_id, full_name, orcid
field_id -> name
category_id -> field_id, name
paper_id -> submitted_by_user_id, category_id, title, abstract,
            document_reference, status, created_at, updated_at
(paper_id, author_id) -> author_order, is_corresponding_author
keyword_id -> name
review_id -> paper_id, reviewer_id, decision, reason, reviewed_at
administrator_id -> name, email
comment_id -> paper_id, author_user_id, parent_comment_id, body,
              created_at, updated_at
```

The non-key attributes in each relation depend on its key, the whole key and no non-key attribute. The final design therefore satisfies 3NF under the stated business rules.

## Deliberate design choices

Two aspects may appear similar but represent different facts:

- `users.name` is the name associated with a platform account, while `authors.full_name` is the name credited on scholarly work. An author may not have an account, and a credited name may differ from an account name.
- `papers.status` records the current workflow state, while `paper_reviews` preserves the events that led to moderation decisions. Keeping the current state makes pending papers representable and supports direct status filtering. The application or a database transaction must keep the current state consistent with review activity.


## Result

The normalised model stores users, authors, institutions, classifications, keywords and moderation events independently and connects them using foreign keys. It avoids repeating descriptive data for every paper while preserving the relationships required for submission, authorship, discovery, moderation and discussion.
