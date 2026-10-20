BEGIN;

SET search_path TO nubian_portfolio, public;

-- Query 1 filters published papers by category and requests newest rows first.
-- The partial index excludes pending and rejected papers from this access path.
CREATE INDEX IF NOT EXISTS papers_published_category_created_at_idx
    ON papers (category_id, created_at DESC)
    WHERE status = 'published';

-- The paper_authors primary key begins with paper_id. This reverse lookup
-- index supports searches that begin with an author_id instead.
CREATE INDEX IF NOT EXISTS paper_authors_author_paper_idx
    ON paper_authors (author_id, paper_id);

-- The comment-thread query locates roots by paper and descendants by their
-- parent within that paper.
CREATE INDEX IF NOT EXISTS comments_paper_parent_created_at_idx
    ON comments (paper_id, parent_comment_id, created_at);

-- Query 4 reads pending papers from oldest to newest. Restricting the index
-- to pending rows keeps it smaller than an index covering every paper status.
CREATE INDEX IF NOT EXISTS papers_pending_created_at_idx
    ON papers (created_at)
    WHERE status = 'pending';

COMMIT;

ANALYZE nubian_portfolio.papers;
ANALYZE nubian_portfolio.paper_authors;
ANALYZE nubian_portfolio.comments;
