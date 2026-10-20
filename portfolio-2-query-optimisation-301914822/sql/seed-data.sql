BEGIN;

SET search_path TO nubian_portfolio, public;

-- This script rebuilds a deterministic synthetic dataset for Portfolio 2.
-- It must be run only against the assessment database because it clears all
-- existing rows in the nubian_portfolio schema.
TRUNCATE TABLE
    comments,
    paper_reviews,
    administrators,
    paper_keywords,
    keywords,
    paper_authors,
    papers,
    categories,
    fields,
    authors,
    institutions,
    users
RESTART IDENTITY;

INSERT INTO institutions (name)
SELECT format('Synthetic Institution %s', to_char(n, 'FM000'))
FROM generate_series(1, 100) AS series(n);

INSERT INTO users (name, email, created_at, updated_at)
SELECT
    format('Synthetic User %s', to_char(n, 'FM00000')),
    format('user%s@example.test', to_char(n, 'FM00000')),
    TIMESTAMPTZ '2024-01-01 00:00:00+00' + n * INTERVAL '1 minute',
    TIMESTAMPTZ '2024-01-01 00:00:00+00' + n * INTERVAL '1 minute'
FROM generate_series(1, 10000) AS series(n);

INSERT INTO authors (user_id, institution_id, full_name)
SELECT
    n,
    ((n - 1) % 100) + 1,
    format('Synthetic Author %s', to_char(n, 'FM00000'))
FROM generate_series(1, 8000) AS series(n);

INSERT INTO fields (name)
SELECT format('Research Field %s', to_char(n, 'FM00'))
FROM generate_series(1, 10) AS series(n);

INSERT INTO categories (field_id, name)
SELECT
    ((n - 1) / 10) + 1,
    format('Research Category %s', to_char(n, 'FM000'))
FROM generate_series(1, 100) AS series(n);

INSERT INTO papers (
    submitted_by_user_id,
    category_id,
    title,
    abstract,
    document_reference,
    status,
    created_at,
    updated_at
)
SELECT
    ((n - 1) % 10000) + 1,
    ((n - 1) % 100) + 1,
    format('Synthetic Research Paper %s', to_char(n, 'FM00000')),
    format(
        'Synthetic abstract for performance-testing paper %s. This text does not describe real research.',
        to_char(n, 'FM00000')
    ),
    format('synthetic/papers/%s.pdf', to_char(n, 'FM00000')),
    CASE
        WHEN n % 10 = 0 THEN 'pending'
        WHEN n % 10 = 1 THEN 'rejected'
        ELSE 'published'
    END,
    TIMESTAMPTZ '2024-01-01 00:00:00+00' + n * INTERVAL '15 minutes',
    TIMESTAMPTZ '2024-01-01 00:00:00+00'
        + n * INTERVAL '15 minutes'
        + CASE WHEN n % 10 = 0 THEN INTERVAL '0 days' ELSE INTERVAL '1 day' END
FROM generate_series(1, 50000) AS series(n);

-- Every paper has one author; every fifth paper has a second author.
INSERT INTO paper_authors (
    paper_id,
    author_id,
    author_order,
    is_corresponding_author
)
SELECT
    n,
    ((n - 1) % 8000) + 1,
    1,
    TRUE
FROM generate_series(1, 50000) AS series(n);

INSERT INTO paper_authors (
    paper_id,
    author_id,
    author_order,
    is_corresponding_author
)
SELECT
    n,
    (n % 8000) + 1,
    2,
    FALSE
FROM generate_series(5, 50000, 5) AS series(n);

INSERT INTO keywords (name)
SELECT format('Synthetic Keyword %s', to_char(n, 'FM000'))
FROM generate_series(1, 200) AS series(n);

-- Each paper receives two distinct keywords.
INSERT INTO paper_keywords (paper_id, keyword_id)
SELECT n, ((n - 1) % 200) + 1
FROM generate_series(1, 50000) AS series(n);

INSERT INTO paper_keywords (paper_id, keyword_id)
SELECT n, ((n + 36) % 200) + 1
FROM generate_series(1, 50000) AS series(n);

INSERT INTO administrators (name, email)
SELECT
    format('Synthetic Administrator %s', to_char(n, 'FM00')),
    format('administrator%s@example.test', to_char(n, 'FM00'))
FROM generate_series(1, 20) AS series(n);

-- Non-pending papers receive a review consistent with their current status.
INSERT INTO paper_reviews (
    paper_id,
    reviewer_id,
    decision,
    reason,
    reviewed_at
)
SELECT
    paper_id,
    ((paper_id - 1) % 20) + 1,
    CASE WHEN status = 'published' THEN 'approved' ELSE 'rejected' END,
    CASE
        WHEN status = 'rejected' THEN 'Synthetic rejection reason for assessment testing.'
        ELSE NULL
    END,
    created_at + INTERVAL '1 day'
FROM papers
WHERE status <> 'pending';

-- Every paper receives one top-level comment.
INSERT INTO comments (
    paper_id,
    author_user_id,
    parent_comment_id,
    body,
    created_at,
    updated_at
)
SELECT
    paper_id,
    (paper_id % 10000) + 1,
    NULL,
    format('Synthetic top-level comment for paper %s.', paper_id),
    created_at + INTERVAL '2 days',
    created_at + INTERVAL '2 days'
FROM papers;

-- Every top-level comment receives one reply on the same paper.
INSERT INTO comments (
    paper_id,
    author_user_id,
    parent_comment_id,
    body,
    created_at,
    updated_at
)
SELECT
    parent.paper_id,
    ((parent.paper_id + 1) % 10000) + 1,
    parent.comment_id,
    format('Synthetic reply for paper %s.', parent.paper_id),
    parent.created_at + INTERVAL '1 hour',
    parent.created_at + INTERVAL '1 hour'
FROM comments AS parent
WHERE parent.parent_comment_id IS NULL;

ANALYZE users;
ANALYZE institutions;
ANALYZE authors;
ANALYZE fields;
ANALYZE categories;
ANALYZE papers;
ANALYZE paper_authors;
ANALYZE keywords;
ANALYZE paper_keywords;
ANALYZE administrators;
ANALYZE paper_reviews;
ANALYZE comments;

COMMIT;

SELECT 'users' AS relation, count(*) AS row_count FROM users
UNION ALL
SELECT 'authors', count(*) FROM authors
UNION ALL
SELECT 'papers', count(*) FROM papers
UNION ALL
SELECT 'paper_authors', count(*) FROM paper_authors
UNION ALL
SELECT 'paper_keywords', count(*) FROM paper_keywords
UNION ALL
SELECT 'paper_reviews', count(*) FROM paper_reviews
UNION ALL
SELECT 'comments', count(*) FROM comments
ORDER BY relation;
