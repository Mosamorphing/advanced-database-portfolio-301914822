\set ON_ERROR_STOP on

SET search_path TO nubian_portfolio, public;

\qecho 'ROLLBACK example: begin paper submission'
BEGIN;

INSERT INTO papers (
    submitted_by_user_id,
    category_id,
    title,
    abstract,
    document_reference,
    status
)
VALUES (
    (SELECT user_id FROM users WHERE email = 'researcher@example.test'),
    (SELECT category_id FROM categories WHERE name = 'Synthetic Transaction Research'),
    'Synthetic Rolled-Back Paper',
    'A fictional paper used to demonstrate a transaction rollback.',
    'portfolio3/rolled-back-paper.pdf',
    'pending'
)
;

INSERT INTO paper_authors (
    paper_id,
    author_id,
    author_order,
    is_corresponding_author
)
VALUES (
    (
        SELECT paper_id
        FROM papers
        WHERE document_reference = 'portfolio3/rolled-back-paper.pdf'
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

\qecho 'ROLLBACK verification before rollback: both records are visible inside the transaction'
SELECT
    count(DISTINCT p.paper_id) AS paper_rows,
    count(pa.paper_id) AS paper_author_rows
FROM papers AS p
LEFT JOIN paper_authors AS pa
    ON pa.paper_id = p.paper_id
WHERE p.document_reference = 'portfolio3/rolled-back-paper.pdf';

ROLLBACK;

\qecho 'ROLLBACK verification after rollback: neither record remains'
SELECT
    count(p.paper_id) AS paper_rows,
    count(pa.paper_id) AS paper_author_rows
FROM papers AS p
LEFT JOIN paper_authors AS pa
    ON pa.paper_id = p.paper_id
WHERE p.document_reference = 'portfolio3/rolled-back-paper.pdf';
