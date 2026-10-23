\set ON_ERROR_STOP on

SET search_path TO nubian_portfolio, public;

\qecho 'Uncontrolled Session A: begin approval request'
BEGIN ISOLATION LEVEL READ COMMITTED;

SHOW transaction_isolation;

\qecho 'Uncontrolled Session A: initial paper state'
SELECT document_reference, status
FROM papers
WHERE document_reference = 'portfolio3/uncontrolled-concurrency.pdf';

\qecho 'Uncontrolled Session A: pause while Session B acts on the same pending state'
SELECT pg_sleep(8);

INSERT INTO paper_reviews (
    paper_id,
    reviewer_id,
    decision,
    reason
)
VALUES (
    (
        SELECT paper_id
        FROM papers
        WHERE document_reference = 'portfolio3/uncontrolled-concurrency.pdf'
    ),
    (
        SELECT administrator_id
        FROM administrators
        WHERE email = 'administrator@example.test'
    ),
    'approved',
    NULL
);

-- This intentionally unsafe update does not recheck that the paper is still
-- pending after Session A's earlier read.
UPDATE papers
SET
    status = 'published',
    updated_at = CURRENT_TIMESTAMP
WHERE document_reference = 'portfolio3/uncontrolled-concurrency.pdf';

COMMIT;

\qecho 'Uncontrolled Session A: approval committed after Session B'
