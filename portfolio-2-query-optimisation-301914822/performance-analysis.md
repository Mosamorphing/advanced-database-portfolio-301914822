# Performance Analysis

## Method

The five queries were executed against the deterministic synthetic dataset in PostgreSQL 17. Baseline plans were captured with `EXPLAIN (ANALYZE, BUFFERS)` before adding the Portfolio 2 indexes. The same queries were then measured again in the same temporary database after applying [`indexes.sql`](./sql/indexes.sql) and refreshing planner statistics with `ANALYZE`.

The recorded execution times describe these individual local runs rather than a production benchmark. Execution-plan operations, rows examined, and buffer usage provide the stronger evidence because timings can vary with hardware and cache state.

## Results

| Query | Baseline plan and time | Optimised plan and time | Observed effect |
| --- | --- | --- | --- |
| Recent published papers by category | Sequentially scanned 50,000 papers, discarded 49,500 rows, and performed a top-N sort; 3.853 ms | Used `papers_published_category_created_at_idx` to retrieve rows in the required order; 0.151 ms | Avoided the full paper scan and separate sort. |
| Papers by author | Sequentially scanned 60,000 paper-author associations and discarded 59,986 rows; 3.948 ms | Used `paper_authors_author_paper_idx` through a bitmap index scan; 0.251 ms | Supported the reverse lookup beginning with `author_id`. |
| Threaded comments for a paper | Scanned 100,000 child comments twice during recursive processing and used 3,232 buffer accesses; 30.677 ms | Used `comments_paper_parent_created_at_idx` for both the root and descendant lookups and used 16 buffer accesses; 0.155 ms | Replaced repeated full scans with targeted index lookups. |
| Papers awaiting review | Scanned 50,000 papers, discarded 45,000 rows, joined 5,000 pending rows, and sorted them; 8.280 ms | Used `papers_pending_created_at_idx` to read the oldest pending rows directly and stop after 20; 0.211 ms | Avoided scanning and sorting the complete pending set. |
| Publication count by research field | Sequentially scanned the papers and aggregated 40,000 published rows; 17.707 ms | Retained the sequential scan and aggregation; 18.163 ms | No useful change was expected because the query consumes most published rows. |

The first four queries changed from broad scans to selective index access and showed substantially lower work in the captured plans. Query 3 produced the clearest improvement: the recursive step stopped scanning the entire comments relation for each level and instead located children using their paper and parent identifiers.

## Index decisions

### Published papers by category

`papers_published_category_created_at_idx` contains only published papers and orders entries by category and descending creation time. This matches both the filters and ordering of Query 1. Its partial condition avoids storing pending and rejected papers in an access path intended for published content.

### Papers by author

The existing `paper_authors` primary key is ordered as `(paper_id, author_id)`, which supports lookups beginning with a paper. Query 2 begins with an author, so `paper_authors_author_paper_idx` supplies the reverse column order required for that access pattern.

### Comment threads

`comments_paper_parent_created_at_idx` begins with `paper_id` and `parent_comment_id`. These columns identify the roots of a paper's discussion and the children of each comment, allowing both parts of the recursive query to use the same index.

### Pending review queue

`papers_pending_created_at_idx` contains only pending papers in creation-time order. PostgreSQL can read the oldest entries first and stop when the query's limit is reached instead of materialising and sorting every pending paper.

### Publication aggregation

No additional index was created for Query 5. The query processes 40,000 of the 50,000 papers, so a sequential scan remains a reasonable planner choice. Adding an index solely to force a different plan would add storage and write-maintenance cost without evidence of a useful improvement.

## Trade-offs and limitations

Indexes consume storage and must be maintained when indexed values are inserted, updated, or deleted. The four indexes are therefore tied to demonstrated access patterns rather than added to every filter or join column. The two partial paper indexes reduce this cost by containing only rows relevant to their respective statuses.

The dataset and workload are synthetic, and each timing is from a single local PostgreSQL container. The results demonstrate plan changes under the documented assessment conditions; they do not predict Nubian Research's production performance or disclose its workload characteristics.

The complete captured plans are available in [`plans-before.txt`](./evidence/plans-before.txt) and [`plans-after.txt`](./evidence/plans-after.txt).
