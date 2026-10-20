SET search_path TO nubian_portfolio, public;

\qecho 'Query 1: recent published papers by category'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    p.paper_id,
    p.title,
    c.name AS category_name,
    p.created_at
FROM papers AS p
JOIN categories AS c
    ON c.category_id = p.category_id
WHERE p.status = 'published'
  AND p.category_id = 42
ORDER BY p.created_at DESC
LIMIT 20;

\qecho 'Query 2: papers by author'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    a.author_id,
    a.full_name,
    p.paper_id,
    p.title,
    pa.author_order,
    p.status,
    p.created_at
FROM authors AS a
JOIN paper_authors AS pa
    ON pa.author_id = a.author_id
JOIN papers AS p
    ON p.paper_id = pa.paper_id
WHERE a.author_id = 101
ORDER BY p.created_at DESC;

\qecho 'Query 3: threaded comments for a paper'
EXPLAIN (ANALYZE, BUFFERS)
WITH RECURSIVE comment_thread AS (
    SELECT
        c.comment_id,
        c.paper_id,
        c.parent_comment_id,
        c.author_user_id,
        c.body,
        c.created_at,
        0 AS depth,
        ARRAY[c.comment_id] AS traversal_path
    FROM comments AS c
    WHERE c.paper_id = 4242
      AND c.parent_comment_id IS NULL

    UNION ALL

    SELECT
        child.comment_id,
        child.paper_id,
        child.parent_comment_id,
        child.author_user_id,
        child.body,
        child.created_at,
        parent.depth + 1,
        parent.traversal_path || child.comment_id
    FROM comments AS child
    JOIN comment_thread AS parent
        ON child.parent_comment_id = parent.comment_id
       AND child.paper_id = parent.paper_id
)
SELECT
    comment_id,
    parent_comment_id,
    author_user_id,
    depth,
    body,
    created_at
FROM comment_thread
ORDER BY traversal_path;

\qecho 'Query 4: papers awaiting review'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    p.paper_id,
    p.title,
    u.name AS submitted_by,
    c.name AS category_name,
    p.created_at
FROM papers AS p
JOIN users AS u
    ON u.user_id = p.submitted_by_user_id
JOIN categories AS c
    ON c.category_id = p.category_id
WHERE p.status = 'pending'
ORDER BY p.created_at
LIMIT 20;

\qecho 'Query 5: publication count by research field'
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    f.field_id,
    f.name AS field_name,
    count(p.paper_id) AS published_paper_count
FROM fields AS f
JOIN categories AS c
    ON c.field_id = f.field_id
JOIN papers AS p
    ON p.category_id = c.category_id
WHERE p.status = 'published'
GROUP BY f.field_id, f.name
ORDER BY published_paper_count DESC, f.field_id;
