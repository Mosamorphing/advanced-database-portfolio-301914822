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

## Implementation progress

The deployment tranche provides:

- [`docker-compose.yml`](./docker-compose.yml), containing three MongoDB 8.0 members, separate persistent volumes and a private internal network with no published database ports.
- [`initialise-replica-set.js`](./mongodb/initialise-replica-set.js), which creates the exact replica-set configuration or safely validates it when rerun.
- [`validate-topology.js`](./mongodb/validate-topology.js), which verifies three data-bearing voters, a majority of two, one primary and two secondaries.
- [`topology-validation.txt`](./evidence/topology-validation.txt), containing the successful fresh, repeated and read-only validation output.

Each member limits its WiredTiger internal cache to `0.256` GB because three database processes share one laptop. This is a resource bound for the local exercise, not a production capacity recommendation.

The remaining implementation will add fixed synthetic paper records, majority-acknowledged writes, replication validation, primary failover, a post-failover write, member rejoin evidence and selected screenshots.

## Planned evidence

The evidence will show:

- The three replica-set members and their elected roles.
- The same baseline document identifiers on all three members.
- A primary becoming unavailable and another member being elected.
- A successful majority write while two members remain available.
- The restarted member receiving the post-failover record.
- Final member health and data counts.

## Reproduction: deployment and topology

Run the following commands from the repository root. Docker must be installed and running.

Start all three members and wait until their MongoDB processes respond:

```bash
docker compose \
  -f portfolio-5-distributed-cloud-301914822/docker-compose.yml \
  up -d --wait --wait-timeout 90
```

Initialise the replica set from `mongo1`. The script discovers the elected roles and is safe to rerun:

```bash
docker compose \
  -f portfolio-5-distributed-cloud-301914822/docker-compose.yml \
  exec -T mongo1 \
  mongosh --quiet \
  --file /portfolio5/mongodb/initialise-replica-set.js
```

Run the independent topology check:

```bash
docker compose \
  -f portfolio-5-distributed-cloud-301914822/docker-compose.yml \
  exec -T mongo1 \
  mongosh --quiet \
  --file /portfolio5/mongodb/validate-topology.js
```

Pause the exercise without deleting its named volumes:

```bash
docker compose \
  -f portfolio-5-distributed-cloud-301914822/docker-compose.yml \
  stop
```

Rerunning the earlier `up -d --wait --wait-timeout 90` command resumes the preserved deployment.

Full cleanup deliberately deletes the three local assessment volumes and should be used only after all Portfolio 5 evidence has been captured:

```bash
docker compose \
  -f portfolio-5-distributed-cloud-301914822/docker-compose.yml \
  down --volumes
```

## Data and security declaration

Only fixed fictional records created for this assessment will be used. No production or externally sourced dataset will be copied into the deployment.

Authentication and transport encryption will be omitted only inside a dedicated internal Docker network to keep the exercise reproducible. MongoDB ports will not be published to the host, and `mongosh` validation commands will run inside a replica-set container. A production deployment would require authenticated members, encrypted connections, managed secrets, access controls, monitoring and tested backup procedures.

## Scope and deployment boundary

This exercise runs three MongoDB members in separate containers on one laptop. It demonstrates replication, primary election and recovery from one database-member failure.

Because the containers share one physical host and network, it does not test host, availability-zone or regional failure. The results provide functional evidence of distributed-database behaviour, not a cloud performance or resilience benchmark.

In a production cloud deployment, members would be placed across independent failure domains. This portfolio discusses that mapping without using Nubian Research infrastructure or requiring a paid cloud account.
