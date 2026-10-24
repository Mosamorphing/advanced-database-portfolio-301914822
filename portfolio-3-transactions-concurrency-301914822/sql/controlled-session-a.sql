\set ON_ERROR_STOP on

SET search_path TO nubian_portfolio, public;
SET application_name TO 'portfolio3-controlled-session-a';

\qecho 'Controlled Session A: begin approval request'
BEGIN ISOLATION LEVEL READ COMMITTED;

SHOW transaction_isolation;

\qecho 'Controlled Session A: acquire the paper row lock'
SELECT document_reference, status
FROM papers
WHERE document_reference = 'portfolio3/controlled-concurrency.pdf'
FOR UPDATE;

\qecho 'Controlled Session A: row locked; hold it while Session B attempts access'
SELECT pg_sleep(15);

INSERT INTO paper_reviews (
    paper_id,
    reviewer_id,
    decision,
    reason
)
SELECT
    p.paper_id,
    a.administrator_id,
    'approved',
    NULL
FROM papers AS p
CROSS JOIN administrators AS a
WHERE p.document_reference = 'portfolio3/controlled-concurrency.pdf'
  AND p.status = 'pending'
  AND a.email = 'administrator@example.test';

UPDATE papers
SET
    status = 'published',
    updated_at = CURRENT_TIMESTAMP
WHERE document_reference = 'portfolio3/controlled-concurrency.pdf'
  AND status = 'pending';

COMMIT;

\qecho 'Controlled Session A: approval committed and row lock released'
