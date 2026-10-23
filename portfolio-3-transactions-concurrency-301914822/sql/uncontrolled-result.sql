\set ON_ERROR_STOP on

SET search_path TO nubian_portfolio, public;

\qecho 'Uncontrolled concurrency final state'
SELECT
    p.document_reference,
    p.status AS final_status,
    count(pr.review_id) AS review_count,
    string_agg(pr.decision, ' -> ' ORDER BY pr.review_id) AS recorded_decisions
FROM papers AS p
LEFT JOIN paper_reviews AS pr
    ON pr.paper_id = p.paper_id
WHERE p.document_reference = 'portfolio3/uncontrolled-concurrency.pdf'
GROUP BY p.paper_id, p.document_reference, p.status;
