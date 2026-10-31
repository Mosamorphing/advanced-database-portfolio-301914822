# Entity-Relationship Diagram

This diagram models the core research-publication domain selected for Portfolio 1 as an advanced database design for the case study.

```mermaid
erDiagram
    INSTITUTION o|--o{ AUTHOR : affiliates
    USER o|--o| AUTHOR : "may represent"
    USER ||--o{ PAPER : submits
    FIELD ||--o{ CATEGORY : contains
    CATEGORY ||--o{ PAPER : classifies
    PAPER ||--|{ PAPER_AUTHOR : credits
    AUTHOR ||--o{ PAPER_AUTHOR : contributes
    PAPER ||--o{ PAPER_KEYWORD : tagged_with
    KEYWORD ||--o{ PAPER_KEYWORD : describes
    PAPER ||--o{ PAPER_REVIEW : receives
    ADMINISTRATOR ||--o{ PAPER_REVIEW : performs
    PAPER ||--o{ COMMENT : receives
    USER ||--o{ COMMENT : writes
    COMMENT o|--o{ COMMENT : parent_of

    USER {
        bigint user_id PK
        varchar name
        varchar email UK
        timestamp created_at
        timestamp updated_at
    }

    INSTITUTION {
        bigint institution_id PK
        varchar name UK
    }

    AUTHOR {
        bigint author_id PK
        bigint user_id FK,UK "optional"
        bigint institution_id FK "optional"
        varchar full_name
        varchar orcid UK "optional"
    }

    FIELD {
        bigint field_id PK
        varchar name UK
    }

    CATEGORY {
        bigint category_id PK
        bigint field_id FK
        varchar name
    }

    PAPER {
        bigint paper_id PK
        bigint submitted_by_user_id FK
        bigint category_id FK
        varchar title
        text abstract
        varchar document_reference UK
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    PAPER_AUTHOR {
        bigint paper_id PK,FK
        bigint author_id PK,FK
        integer author_order
        boolean is_corresponding_author
    }

    KEYWORD {
        bigint keyword_id PK
        varchar name UK
    }

    PAPER_KEYWORD {
        bigint paper_id PK,FK
        bigint keyword_id PK,FK
    }

    ADMINISTRATOR {
        bigint administrator_id PK
        varchar name
        varchar email UK
    }

    PAPER_REVIEW {
        bigint review_id PK
        bigint paper_id FK
        bigint reviewer_id FK
        varchar decision
        text reason "optional"
        timestamp reviewed_at
    }

    COMMENT {
        bigint comment_id PK
        bigint paper_id FK
        bigint author_user_id FK
        bigint parent_comment_id FK "optional"
        text body
        timestamp created_at
        timestamp updated_at
    }
```

## Main design decisions

- A user account submits a paper, but submission responsibility is separate from authorship.
- A paper must credit at least one author and may credit several authors.
- An author does not need a Nubian Research account. The optional link between `AUTHOR` and `USER` connects an author identity to an account when one exists.
- `PAPER_AUTHOR` resolves the many-to-many relationship between papers and authors while preserving author order and the corresponding-author designation.
- Every paper belongs to one category, and every category belongs to one research field.
- `PAPER_KEYWORD` resolves the many-to-many relationship between papers and keywords.
- `PAPER_REVIEW` records moderation decisions separately from a paper's current status, allowing review history to be retained.
- A comment belongs to one paper and one registered user. Its optional self-reference supports replies.

## Cardinality notation

| Symbol | Meaning |
| --- | --- |
| <code>&#124;&#124;</code> | Exactly one |
| <code>o&#124;</code> | Zero or one |
| <code>&#124;{</code> | One or many |
| <code>o{</code> | Zero or many |

The model deliberately excludes authentication sessions, donations, project-showcase submissions, email delivery, and deployment infrastructure, as seen on the live Nubian Research infrastructure. 
