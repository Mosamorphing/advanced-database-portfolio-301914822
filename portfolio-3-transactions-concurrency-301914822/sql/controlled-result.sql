\set ON_ERROR_STOP on

SET search_path TO nubian_portfolio, public;

\qecho 'Controlled concurrency final state'
SELECT
    p.document_reference,
    p.status AS final_status,
    count(pr.review_id) AS review_count,
    count(pr.review_id) FILTER (
        WHERE pr.decision = 'rejected'
    ) AS rejected_review_count,
    string_agg(pr.decision, ' -> ' ORDER BY pr.review_id) AS recorded_decisions
FROM papers AS p
LEFT JOIN paper_reviews AS pr
    ON pr.paper_id = p.paper_id
WHERE p.document_reference = 'portfolio3/controlled-concurrency.pdf'
GROUP BY p.paper_id, p.document_reference, p.status;
