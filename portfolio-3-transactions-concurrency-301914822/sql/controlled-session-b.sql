\set ON_ERROR_STOP on

SET search_path TO nubian_portfolio, public;
SET application_name TO 'portfolio3-controlled-session-b';

\qecho 'Controlled Session B: begin rejection request'
BEGIN ISOLATION LEVEL READ COMMITTED;

SHOW transaction_isolation;

\timing on
\qecho 'Controlled Session B: request the same row lock and wait for Session A'
SELECT document_reference, status
FROM papers
WHERE document_reference = 'portfolio3/controlled-concurrency.pdf'
FOR UPDATE;
\timing off

\qecho 'Controlled Session B: lock acquired; apply only if status is still pending'
INSERT INTO paper_reviews (
    paper_id,
    reviewer_id,
    decision,
    reason
)
SELECT
    p.paper_id,
    a.administrator_id,
    'rejected',
    'Synthetic rejection used only for the controlled concurrency demonstration.'
FROM papers AS p
CROSS JOIN administrators AS a
WHERE p.document_reference = 'portfolio3/controlled-concurrency.pdf'
  AND p.status = 'pending'
  AND a.email = 'administrator@example.test';

UPDATE papers
SET
    status = 'rejected',
    updated_at = CURRENT_TIMESTAMP
WHERE document_reference = 'portfolio3/controlled-concurrency.pdf'
  AND status = 'pending';

COMMIT;

\qecho 'Controlled Session B: transaction completed without a conflicting decision'
