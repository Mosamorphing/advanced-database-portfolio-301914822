# Schema Validation

## Environment

- Database: PostgreSQL 17
- Dataset: Synthetic records using the reserved `example.test` domain
- Production data: None

## Reproduction

Run both scripts against a clean PostgreSQL database:

```bash
psql -U postgres -v ON_ERROR_STOP=1 -f sql/schema.sql
psql -U postgres -v ON_ERROR_STOP=1 -f sql/validate-schema.sql
```

`schema.sql` creates the `nubian_portfolio` namespace and its relations. `validate-schema.sql` begins a transaction, inserts a small connected dataset, runs validation queries and rolls the data back. The schema remains available while the synthetic test records are removed.

## Checks performed

The validation confirms that:

- All 12 relations are created successfully.
- A paper can retain an ordered list containing both a registered author and an external co-author.
- A comment reply can retrieve its parent comment within the same paper.
- The paper-status check rejects a value outside `pending`, `published` and `rejected`.
- A rejected review without a reason is rejected.
- The validation data is removed with `ROLLBACK`.

## Result

The schema and validation scripts executed successfully against PostgreSQL 17. The principal output was:

```text
 relation_count
----------------
             12

 title                        | ordered_authors
------------------------------+--------------------------------
 A Synthetic Research Paper   | Ada Researcher, Bola External

 reply                 | parent_comment
-----------------------+----------------------------------
 A synthetic reply.    | A top-level synthetic comment.

NOTICE: PASS: invalid paper status was rejected
NOTICE: PASS: rejected review without a reason was rejected
ROLLBACK
```

The scripts contain no production records, credentials or internal infrastructure details.
