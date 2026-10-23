# Portfolio 3: Transactions and Concurrency

## Purpose

This activity continues the Nubian Research case study and uses the PostgreSQL schema developed in Portfolio 1. It demonstrates how transactions preserve consistency when a database operation affects multiple related records and how concurrent access can be controlled when different sessions attempt to modify the same record.

The examples use synthetic assessment data in an isolated PostgreSQL 17 database. They do not reproduce Nubian Research's production database, records, private source code, or internal moderation procedures.

## Transaction scope

The activity focuses on two ordinary operations within a research-publication system:

1. Submitting a paper together with its authorship record.
2. Reviewing a pending paper and updating its publication status.

These operations extend two consistency concerns identified during Portfolio 1: a paper should not be left without an author, and its current status should agree with the applicable moderation decision.

## Demonstration scenarios

### Successful transaction and commit

A paper record and its author association will be inserted within one transaction. The transaction will be committed only after both operations succeed. Verification queries will show that the related records remain in the database after `COMMIT`.

### Cancelled transaction and rollback

A second paper submission will be started and then deliberately rolled back. Verification queries will show that neither the paper nor its dependent authorship record remains after `ROLLBACK`. This demonstrates that an incomplete operation does not leave partial data behind.

### Uncontrolled concurrent moderation

Two database sessions representing the same administrative workflow will first review the same pending paper without an explicit locking strategy. This could occur through two browser tabs or a repeated request. Both sessions will read the paper while its status is `pending`; one will approve it while the other rejects it. This can record incompatible review events and allow the final status to depend on which update is applied last.

The demonstration does not treat the existence of multiple review records as an error by itself because the schema permits review history. The concurrency problem is that both decisions act on the same stale `pending` state and attempt to determine the paper's current status.

### Controlled concurrent moderation

The scenario will then be repeated using an explicit transaction and `SELECT ... FOR UPDATE` to lock the selected paper. While the first session holds the row lock, the second session must wait. After the first transaction commits, the second session will recheck the current status and will not apply another decision if the paper is no longer pending.

The comparison demonstrates the original concurrency risk, transaction isolation, lock visibility, and a database-level mechanism for preventing conflicting moderation updates.

## Expected evidence

This portfolio will provide:

- A reproducible synthetic setup for the transaction scenarios.
- SQL demonstrating a successful `COMMIT`.
- SQL demonstrating `ROLLBACK` and the absence of partial records.
- Two-session SQL demonstrating the uncontrolled concurrent moderation outcome.
- Two-session SQL demonstrating row-level locking and conditional decision processing.
- Output and screenshots showing transaction state, the uncontrolled result, blocking behaviour, and the controlled final state.
- A brief analysis explaining atomicity, isolation, the concurrency risk, and the selected control mechanism.

## Reproducibility

The completed activity will run against PostgreSQL 17. The execution order will distinguish single-session transaction examples from the two-terminal concurrency demonstration so that each result can be reproduced without access to Nubian Research's live systems.
