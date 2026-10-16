\set ON_ERROR_STOP on

BEGIN;

SET search_path TO nubian_portfolio, public;

INSERT INTO institutions (name)
VALUES ('Example University');

INSERT INTO users (name, email)
VALUES
    ('Ada Researcher', 'ada.researcher@example.test'),
    ('Tunde Reader', 'tunde.reader@example.test');

INSERT INTO authors (user_id, institution_id, full_name, orcid)
SELECT
    users.user_id,
    institutions.institution_id,
    'Ada Researcher',
    '0000-0002-1825-0097'
FROM users
CROSS JOIN institutions
WHERE users.email = 'ada.researcher@example.test'
  AND institutions.name = 'Example University';

INSERT INTO authors (institution_id, full_name)
SELECT institution_id, 'Bola External'
FROM institutions
WHERE name = 'Example University';

INSERT INTO fields (name)
VALUES ('Computing');

INSERT INTO categories (field_id, name)
SELECT field_id, 'Database Systems'
FROM fields
WHERE name = 'Computing';

INSERT INTO keywords (name)
VALUES ('PostgreSQL'), ('Open Access');

INSERT INTO papers (
    submitted_by_user_id,
    category_id,
    title,
    abstract,
    document_reference
)
SELECT
    users.user_id,
    categories.category_id,
    'A Synthetic Research Paper',
    'Synthetic content created only to validate the portfolio database.',
    'document://portfolio/paper-001'
FROM users
CROSS JOIN categories
WHERE users.email = 'ada.researcher@example.test'
  AND categories.name = 'Database Systems';

INSERT INTO paper_authors (
    paper_id,
    author_id,
    author_order,
    is_corresponding_author
)
SELECT papers.paper_id, authors.author_id, 1, TRUE
FROM papers
CROSS JOIN authors
WHERE papers.document_reference = 'document://portfolio/paper-001'
  AND authors.full_name = 'Ada Researcher';

INSERT INTO paper_authors (
    paper_id,
    author_id,
    author_order,
    is_corresponding_author
)
SELECT papers.paper_id, authors.author_id, 2, FALSE
FROM papers
CROSS JOIN authors
WHERE papers.document_reference = 'document://portfolio/paper-001'
  AND authors.full_name = 'Bola External';

INSERT INTO paper_keywords (paper_id, keyword_id)
SELECT papers.paper_id, keywords.keyword_id
FROM papers
CROSS JOIN keywords
WHERE papers.document_reference = 'document://portfolio/paper-001';

INSERT INTO administrators (name, email)
VALUES ('Amina Reviewer', 'amina.reviewer@example.test');

INSERT INTO paper_reviews (paper_id, reviewer_id, decision)
SELECT papers.paper_id, administrators.administrator_id, 'approved'
FROM papers
CROSS JOIN administrators
WHERE papers.document_reference = 'document://portfolio/paper-001'
  AND administrators.email = 'amina.reviewer@example.test';

INSERT INTO comments (paper_id, author_user_id, body)
SELECT papers.paper_id, users.user_id, 'A top-level synthetic comment.'
FROM papers
CROSS JOIN users
WHERE papers.document_reference = 'document://portfolio/paper-001'
  AND users.email = 'tunde.reader@example.test';

INSERT INTO comments (paper_id, author_user_id, parent_comment_id, body)
SELECT
    papers.paper_id,
    users.user_id,
    parent.comment_id,
    'A synthetic reply.'
FROM papers
CROSS JOIN users
CROSS JOIN comments AS parent
WHERE papers.document_reference = 'document://portfolio/paper-001'
  AND users.email = 'ada.researcher@example.test'
  AND parent.body = 'A top-level synthetic comment.';

SELECT COUNT(*) AS relation_count
FROM information_schema.tables
WHERE table_schema = 'nubian_portfolio'
  AND table_type = 'BASE TABLE';

SELECT
    papers.title,
    string_agg(authors.full_name, ', ' ORDER BY paper_authors.author_order) AS ordered_authors
FROM papers
JOIN paper_authors USING (paper_id)
JOIN authors USING (author_id)
WHERE papers.document_reference = 'document://portfolio/paper-001'
GROUP BY papers.paper_id, papers.title;

SELECT
    child.body AS reply,
    parent.body AS parent_comment
FROM comments AS child
JOIN comments AS parent
  ON parent.comment_id = child.parent_comment_id
 AND parent.paper_id = child.paper_id;

DO $$
BEGIN
    BEGIN
        INSERT INTO papers (
            submitted_by_user_id,
            category_id,
            title,
            abstract,
            document_reference,
            status
        )
        SELECT
            users.user_id,
            categories.category_id,
            'Invalid Status Test',
            'This insert must be rejected by the status constraint.',
            'document://portfolio/invalid-status',
            'archived'
        FROM users
        CROSS JOIN categories
        WHERE users.email = 'ada.researcher@example.test'
          AND categories.name = 'Database Systems';

        RAISE EXCEPTION 'FAIL: invalid paper status was accepted';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'PASS: invalid paper status was rejected';
    END;
END
$$;

DO $$
BEGIN
    BEGIN
        INSERT INTO paper_reviews (paper_id, reviewer_id, decision)
        SELECT papers.paper_id, administrators.administrator_id, 'rejected'
        FROM papers
        CROSS JOIN administrators
        WHERE papers.document_reference = 'document://portfolio/paper-001'
          AND administrators.email = 'amina.reviewer@example.test';

        RAISE EXCEPTION 'FAIL: rejected review without a reason was accepted';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'PASS: rejected review without a reason was rejected';
    END;
END
$$;

ROLLBACK;
