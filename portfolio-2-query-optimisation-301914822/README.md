# Portfolio 2: Query Processing and Optimisation

## Purpose

This activity continues the Nubian Research case study and uses the PostgreSQL schema developed in Portfolio 1. It examines how representative queries are executed, identifies avoidable work in their execution plans, and evaluates whether targeted indexes improve their performance.

The analysis uses synthetic data only. It does not reproduce Nubian Research's production database, production records, private source code, or internal operational metrics.

## Synthetic dataset declaration

The dataset is generated locally by [`sql/seed-data.sql`](./sql/seed-data.sql) specifically for this assessment. The script uses PostgreSQL's `generate_series()` function and fixed arithmetic rules rather than production records, externally sourced datasets, or random values. It therefore produces the same relationships and row volumes each time it is run.

The generated dataset contains 100 institutions, 10,000 users, 8,000 authors, 10 research fields, 100 categories, 50,000 papers, 60,000 paper-author associations, 200 keywords, 100,000 paper-keyword associations, 20 administrators, 45,000 paper reviews, and 100,000 comments. Names, email addresses, document references, abstracts, comments, classifications, timestamps, and status distributions are fictional. Email addresses use the reserved `example.test` domain.

The volumes and distributions are deliberate testing assumptions chosen to make query-planning differences observable on an ordinary development computer. They do not represent measurements of Nubian Research's users, content, workload, growth, or performance. The dataset is suitable for reproducible query experiments but not for drawing conclusions about production behaviour.

## Query scope

Five queries represent common operations in the research-publication domain:

1. **Recent published papers by category** — filters papers by publication status and category, then orders them by submission date.
2. **Papers by author** — traverses the many-to-many relationship between authors and papers.
3. **Threaded comments for a paper** — retrieves top-level comments and their replies through the self-referencing comment relationship.
4. **Papers awaiting review** — retrieves pending papers in submission order for administrative review.
5. **Publication count by research field** — joins the classification hierarchy and aggregates published papers by field.

Together, the queries exercise filtering, sorting, joins, many-to-many traversal, hierarchical retrieval, and aggregation. They are assessment scenarios derived from the Portfolio 1 data model rather than copies of production queries.

## Optimisation approach

The work will proceed in four stages:

1. Load a reproducible synthetic dataset large enough for PostgreSQL to make meaningful planning decisions.
2. Execute the queries and record their results and baseline plans using `EXPLAIN (ANALYZE, BUFFERS)`.
3. Add only indexes justified by observed access patterns and execution-plan evidence.
4. Execute the same queries again and compare plan operations, execution time, rows processed, and buffer usage.

Primary-key and unique-constraint indexes created by Portfolio 1 remain part of the baseline. Any additional index must have a stated purpose; an index will not be retained merely because it exists.

## Evidence

This portfolio provides:

- Executable [`queries.sql`](./sql/queries.sql) and [`seed-data.sql`](./sql/seed-data.sql).
- [`query-results.txt`](./evidence/query-results.txt), demonstrating that the five queries return the intended results.
- [`plans-before.txt`](./evidence/plans-before.txt), captured before optimisation.
- [`indexes.sql`](./sql/indexes.sql), containing the four justified index definitions.
- [`plans-after.txt`](./evidence/plans-after.txt), captured after optimisation.
- A [performance analysis](./performance-analysis.md) comparing the plans and explaining the design choices.

## Reproducibility

The completed activity will run against PostgreSQL 17. Its scripts and execution order will be documented so that the schema, data, queries, indexes, and evidence can be reproduced without access to Nubian Research's live systems.
