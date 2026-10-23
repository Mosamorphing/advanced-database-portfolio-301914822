\set ON_ERROR_STOP on

BEGIN;

SET search_path TO nubian_portfolio, public;

-- Rebuild only the synthetic assessment data. Run this script against an
-- isolated Portfolio 3 database because it removes existing rows.
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
VALUES ('Synthetic Research Institute');

INSERT INTO users (name, email)
VALUES ('Synthetic Researcher', 'researcher@example.test');

INSERT INTO authors (user_id, institution_id, full_name)
VALUES (
    (SELECT user_id FROM users WHERE email = 'researcher@example.test'),
    (SELECT institution_id FROM institutions WHERE name = 'Synthetic Research Institute'),
    'Synthetic Researcher'
);

INSERT INTO fields (name)
VALUES ('Synthetic Database Studies');

INSERT INTO categories (field_id, name)
VALUES (
    (SELECT field_id FROM fields WHERE name = 'Synthetic Database Studies'),
    'Synthetic Transaction Research'
);

INSERT INTO administrators (name, email)
VALUES ('Synthetic Administrator', 'administrator@example.test');

-- These two papers are reserved for the later uncontrolled and controlled
-- concurrency demonstrations.
INSERT INTO papers (
    submitted_by_user_id,
    category_id,
    title,
    abstract,
    document_reference,
    status
)
VALUES
    (
        (SELECT user_id FROM users WHERE email = 'researcher@example.test'),
        (SELECT category_id FROM categories WHERE name = 'Synthetic Transaction Research'),
        'Synthetic Paper for Uncontrolled Concurrency',
        'A fictional paper used to demonstrate an uncontrolled concurrent update.',
        'portfolio3/uncontrolled-concurrency.pdf',
        'pending'
    ),
    (
        (SELECT user_id FROM users WHERE email = 'researcher@example.test'),
        (SELECT category_id FROM categories WHERE name = 'Synthetic Transaction Research'),
        'Synthetic Paper for Controlled Concurrency',
        'A fictional paper used to demonstrate row-level concurrency control.',
        'portfolio3/controlled-concurrency.pdf',
        'pending'
    );

INSERT INTO paper_authors (
    paper_id,
    author_id,
    author_order,
    is_corresponding_author
)
VALUES
    (
        (
            SELECT paper_id
            FROM papers
            WHERE document_reference = 'portfolio3/uncontrolled-concurrency.pdf'
        ),
        (
            SELECT a.author_id
            FROM authors AS a
            JOIN users AS u ON u.user_id = a.user_id
            WHERE u.email = 'researcher@example.test'
        ),
        1,
        TRUE
    ),
    (
        (
            SELECT paper_id
            FROM papers
            WHERE document_reference = 'portfolio3/controlled-concurrency.pdf'
        ),
        (
            SELECT a.author_id
            FROM authors AS a
            JOIN users AS u ON u.user_id = a.user_id
            WHERE u.email = 'researcher@example.test'
        ),
        1,
        TRUE
    );

COMMIT;

\qecho 'Portfolio 3 setup result'
SELECT
    (SELECT count(*) FROM users) AS users,
    (SELECT count(*) FROM authors) AS authors,
    (SELECT count(*) FROM administrators) AS administrators,
    (SELECT count(*) FROM papers WHERE status = 'pending') AS pending_papers,
    (SELECT count(*) FROM paper_authors) AS paper_author_rows;
