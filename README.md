# Advanced Database Systems Portfolio — 301914822

## Overview

This repository contains five completed activities developed around the Nubian Research case study. Each activity is self-contained, while the sequence shows how the same research-publication domain can be examined through relational design, query optimisation, transaction control, document modelling, and database replication.

The case study is an academic abstraction. It does not reproduce Nubian Research's production database, source code, infrastructure, records, workload, or internal operating procedures.

## Portfolio navigation

| Portfolio | Focus | Entry point |
| --- | --- | --- |
| 1 | Database design and modelling | [`portfolio-1-database-design-301914822/README.md`](./portfolio-1-database-design-301914822/README.md) |
| 2 | Query processing and optimisation | [`portfolio-2-query-optimisation-301914822/README.md`](./portfolio-2-query-optimisation-301914822/README.md) |
| 3 | Transactions and concurrency | [`portfolio-3-transactions-concurrency-301914822/README.md`](./portfolio-3-transactions-concurrency-301914822/README.md) |
| 4 | NoSQL and advanced data modelling | [`portfolio-4-nosql-301914822/README.md`](./portfolio-4-nosql-301914822/README.md) |
| 5 | Distributed and cloud databases | [`portfolio-5-distributed-cloud-301914822/README.md`](./portfolio-5-distributed-cloud-301914822/README.md) |

## Continuity across the activities

Portfolio 1 establishes the assessment's relational model and PostgreSQL schema. Portfolios 2 and 3 reuse that schema for query-plan analysis and transaction/concurrency demonstrations. Portfolio 4 maps selected case-study data and read patterns to a MongoDB document model; it is an alternative assessment model rather than a replacement for the relational design. Portfolio 5 extends the document-database work into a three-member replica-set exercise covering replication, majority consistency, failover, recovery, and local-to-cloud design considerations.

Each portfolio folder contains its scope, implementation files, evidence, limitations, and relevant reproduction documentation. Executable scripts and captured evidence remain inside the portfolio folder to which they belong.

## Data and confidentiality boundary

All executable demonstrations use fixed synthetic assessment data. Reserved domains, fictional document references, local container names, and disposable lab credentials are used where needed. No live user records, production credentials, private endpoints, provider configuration, proprietary source code, or measured production performance data are included.
