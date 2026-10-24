# Portfolio 3: Transactions and Concurrency

## Purpose

This activity continues the Nubian Research case study and uses the PostgreSQL schema developed in Portfolio 1. It demonstrates how transactions preserve consistency when an operation affects related records and how row-level locking controls concurrent attempts to modify the same record.

The examples use synthetic assessment data in an isolated PostgreSQL 17 database. They do not reproduce Nubian Research's production database, records, private source code, internal moderation procedures, workload, or performance.

All records are generated directly by [`setup.sql`](./sql/setup.sql) from fixed fictional values. No external or production dataset is used, and the reserved `example.test` domain prevents the synthetic email addresses from identifying real services.

## Demonstrated operations

The activity examines two operations in the assessment model:

1. Submitting a paper together with its authorship record.
2. Reviewing a pending paper and updating its publication status.

One synthetic administrator is used throughout. The two concurrent sessions represent the same administrative workflow being opened twice or retried; they do not imply that Nubian Research uses multiple reviewers for one decision.

## Transaction results

### Successful transaction and `COMMIT`

[`commit-example.sql`](./sql/commit-example.sql) inserts a paper and its authorship association in one transaction. After `COMMIT`, the verification query returns one paper and one corresponding authorship row. Both related changes therefore persist together.

### Cancelled transaction and `ROLLBACK`

[`rollback-example.sql`](./sql/rollback-example.sql) inserts another paper and authorship association. Both rows are visible inside the transaction, but the transaction is deliberately rolled back. The subsequent verification returns zero paper rows and zero authorship rows, so no partial submission remains.

These examples demonstrate atomicity at the transaction level. The schema does not independently require every paper to have an author; the transaction keeps this particular multi-table operation together.

## Concurrency results

Both demonstrations explicitly use PostgreSQL's `READ COMMITTED` isolation level.

### Without explicit concurrency control

[`uncontrolled-session-a.sql`](./sql/uncontrolled-session-a.sql) and [`uncontrolled-session-b.sql`](./sql/uncontrolled-session-b.sql) both read the same paper while its status is `pending`. Session B records a rejection while Session A is paused; Session A then records an approval and changes the status to `published`.

The final state contains two incompatible review decisions, while the paper status reflects the update committed last:

```text
final_status | review_count | recorded_decisions
-------------+--------------+--------------------
published    | 2            | rejected -> approved
```

Multiple review rows are not inherently invalid because the schema permits review history. The demonstrated problem is that both operations acted on the same stale `pending` state and attempted to determine the paper's current status.

### With row-level locking and a status recheck

[`controlled-session-a.sql`](./sql/controlled-session-a.sql) selects the paper using `SELECT ... FOR UPDATE`, which holds a row lock until the transaction completes. When [`controlled-session-b.sql`](./sql/controlled-session-b.sql) requests the same lock, PostgreSQL makes it wait.

After Session A commits, Session B acquires the lock and sees the newly committed `published` status. Its conditional review insertion and status update both affect zero rows because the paper is no longer pending. The final state contains one approved review and no conflicting rejection:

```text
final_status | review_count | rejected_review_count | recorded_decisions
-------------+--------------+-----------------------+-------------------
published    | 1            | 0                     | approved
```

The control mechanism is the combination of the row lock and the status recheck while that lock is still held. The `status = 'pending'` conditions alone would not protect an earlier, separate read from becoming stale.

## Evidence

- [`transaction-results.txt`](./evidence/transaction-results.txt) records the `COMMIT` and `ROLLBACK` results.
- [`uncontrolled-session-a.txt`](./evidence/uncontrolled-session-a.txt) and [`uncontrolled-session-b.txt`](./evidence/uncontrolled-session-b.txt) show that both uncontrolled sessions initially read `pending`.
- [`uncontrolled-result.txt`](./evidence/uncontrolled-result.txt) records the two conflicting decisions and last-update-wins result.
- [`controlled-session-a.txt`](./evidence/controlled-session-a.txt) records the lock holder and its successful approval.
- [`controlled-session-b.txt`](./evidence/controlled-session-b.txt) records the wait, the refreshed `published` state, `INSERT 0 0`, and `UPDATE 0`.
- [`controlled-lock-observation.txt`](./evidence/controlled-lock-observation.txt) identifies Session B waiting on a transaction lock held by Session A.
- [`controlled-result.txt`](./evidence/controlled-result.txt) records the single approved review in the controlled final state.

## Reproduction with Docker

Run the following commands from the repository root. Docker must be installed and running.

### Prepare PostgreSQL 17

```bash
docker run --rm \
  --name nubian-portfolio3-postgres \
  -e POSTGRES_PASSWORD=portfolio_validation \
  -e POSTGRES_DB=nubian_portfolio_lab \
  -d postgres:17

docker exec nubian-portfolio3-postgres \
  pg_isready -U postgres -d nubian_portfolio_lab

docker cp portfolio-1-database-design-301914822/sql/schema.sql \
  nubian-portfolio3-postgres:/tmp/schema.sql

docker cp portfolio-3-transactions-concurrency-301914822/sql/. \
  nubian-portfolio3-postgres:/tmp/

docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/schema.sql
```

Continue only after `pg_isready` reports that the database is accepting connections; rerun that command if PostgreSQL is still starting.

### Run the single-session examples

```bash
docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/run-single-session.sql
```

This command resets the synthetic fixtures before running the `COMMIT` and `ROLLBACK` examples.

### Reproduce the uncontrolled outcome

First reset the fixtures:

```bash
docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/setup.sql
```

Open two terminals. Start Session A in the first terminal, then start Session B in the second while Session A is paused:

```bash
# Terminal A
docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/uncontrolled-session-a.sql
```

```bash
# Terminal B: start within Session A's eight-second pause
docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/uncontrolled-session-b.sql
```

After both sessions finish, inspect the outcome:

```bash
docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/uncontrolled-result.sql
```

### Reproduce the controlled outcome

Run `setup.sql` again before this demonstration. Open two terminals, start Session A, and then start Session B during Session A's 15-second pause:

```bash
# Terminal A
docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/controlled-session-a.sql
```

```bash
# Terminal B
docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/controlled-session-b.sql
```

While Session B is waiting, the blocking relationship can be observed from a third terminal:

```bash
docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/controlled-lock-observation.sql
```

After both sessions finish, inspect the controlled final state:

```bash
docker exec nubian-portfolio3-postgres \
  psql -X -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 --pset pager=off \
  -f /tmp/controlled-result.sql
```

Reset with `setup.sql` before repeating either concurrency demonstration. Stop the temporary database after reviewing the evidence:

```bash
docker stop nubian-portfolio3-postgres
```
