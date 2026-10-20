# Portfolio 2: Query Processing and Optimisation

## Purpose

This activity continues the Nubian Research case study and uses the PostgreSQL schema developed in Portfolio 1. It examines how representative queries are executed, identifies avoidable work in their execution plans, and evaluates whether targeted indexes improve their performance.

The analysis uses synthetic data only. It does not reproduce Nubian Research's production database, production records, private source code, or internal operational metrics.

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

## Expected evidence

This portfolio will provide:

- Executable SQL queries and synthetic seed data.
- Query results demonstrating correctness.
- Execution plans captured before optimisation.
- SQL definitions for the selected indexes.
- Execution plans captured after optimisation.
- A brief performance analysis comparing the evidence and explaining the design choices.

## Reproducibility

The completed activity will run against PostgreSQL 17. Its scripts and execution order will be documented so that the schema, data, queries, indexes, and evidence can be reproduced without access to Nubian Research's live systems.
