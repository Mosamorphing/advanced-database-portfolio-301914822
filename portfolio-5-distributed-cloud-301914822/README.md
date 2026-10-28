# Portfolio 5: Distributed and Cloud Database Exercise

## Purpose

This activity continues the Nubian Research case study by deploying a three-member MongoDB replica set for synthetic research-paper data. It demonstrates how replication, majority consistency and primary election affect database availability when one member becomes unavailable.

The work is an independent academic deployment. It does not reproduce Nubian Research's production database, hosting provider, network topology, credentials, operational procedures, workload or records.

## Portfolio requirement

Portfolio 5 requires a distributed or cloud database discussion or setup based on the same case study, with evidence relating to concepts such as replication, sharding, availability, consistency or deployment.

This portfolio will provide a working local distributed setup and evidence for deployment, replication, consistency, failover and recovery. Sharding is evaluated but deliberately not implemented.

## Selected exercise

MongoDB 8.0 will run as a replica set named `nubian-rs` across three Docker containers:

```text
mongo1 ─┐
mongo2 ─┼── replica set: nubian-rs
mongo3 ─┘
```

All three members will store the same synthetic data. At a given time, one member will accept writes as the primary and the other two will replicate those writes as secondaries. The members will have equal voting priority, so the implementation will discover elected roles rather than assume that a particular container must always be primary.

The detailed topology and consistency decisions are documented in [`distributed-design.md`](./distributed-design.md).

## Planned demonstrations

The implementation will demonstrate:

1. Deploying and initialising three data-bearing replica-set members.
2. Writing a synthetic paper with majority write concern.
3. Verifying that the record reaches both secondary members.
4. Stopping the current primary and observing a new primary election.
5. Completing another majority-acknowledged write with one member unavailable.
6. Restarting the stopped member and verifying that it rejoins and catches up.

The failover target will be discovered dynamically. The exercise will not hard-code which remaining member wins the election.

## Consistency and availability scope

A three-member replica set has a voting majority of two. It can therefore continue accepting writes after one member fails, following a brief election interval. If two members are unavailable, the remaining member cannot form a majority or elect itself primary, so majority writes stop rather than allowing two independent writable histories.

Demonstration writes will request:

```javascript
{ w: "majority", j: true, wtimeout: 10000 }
```

Validation reads from secondary members will use secondary read preference together with majority read concern. Replication is asynchronous, so the validation will use bounded readiness checks instead of claiming that every secondary is updated instantaneously.

## Sharding decision

Replication copies the same dataset between members to support redundancy and failover. Sharding partitions a dataset across multiple shards to address a different problem: horizontal data distribution.

This exercise has no measured dataset size, throughput requirement or justified shard key that would support a sharded design. Adding a sharded cluster would therefore increase operational complexity without answering the selected availability and consistency questions.

## Planned implementation

The completed exercise will contain:

- A Docker Compose deployment with three MongoDB members and persistent local volumes.
- Replica-set initialisation and bounded readiness checks.
- Fixed synthetic paper records and majority-acknowledged writes.
- Replication, election, post-failover write and rejoin validation.
- Captured command output and selected terminal screenshots.
- A final explanation of availability, consistency, sharding and cloud-deployment limitations.

## Planned evidence

The evidence will show:

- The three replica-set members and their elected roles.
- The same baseline document identifiers on all three members.
- A primary becoming unavailable and another member being elected.
- A successful majority write while two members remain available.
- The restarted member receiving the post-failover record.
- Final member health and data counts.

## Data and security declaration

Only fixed fictional records created for this assessment will be used. No production or externally sourced dataset will be copied into the deployment.

Authentication and transport encryption will be omitted only inside a dedicated internal Docker network to keep the exercise reproducible. MongoDB ports will not be published to the host, and `mongosh` validation commands will run inside a replica-set container. A production deployment would require authenticated members, encrypted connections, managed secrets, access controls, monitoring and tested backup procedures.

## Scope and deployment boundary

This exercise runs three MongoDB members in separate containers on one laptop. It demonstrates replication, primary election and recovery from one database-member failure.

Because the containers share one physical host and network, it does not test host, availability-zone or regional failure. The results provide functional evidence of distributed-database behaviour, not a cloud performance or resilience benchmark.

In a production cloud deployment, members would be placed across independent failure domains. This portfolio discusses that mapping without using Nubian Research infrastructure or requiring a paid cloud account.
