\set ON_ERROR_STOP on

SET search_path TO nubian_portfolio, public;

\qecho 'Uncontrolled Session B: begin rejection request'
BEGIN ISOLATION LEVEL READ COMMITTED;

SHOW transaction_isolation;

\qecho 'Uncontrolled Session B: initial paper state'
SELECT document_reference, status
FROM papers
WHERE document_reference = 'portfolio3/uncontrolled-concurrency.pdf';

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
    'rejected',
    'Synthetic rejection used only for the concurrency demonstration.'
);

UPDATE papers
SET
    status = 'rejected',
    updated_at = CURRENT_TIMESTAMP
WHERE document_reference = 'portfolio3/uncontrolled-concurrency.pdf';

COMMIT;

\qecho 'Uncontrolled Session B: rejection committed while Session A was paused'
