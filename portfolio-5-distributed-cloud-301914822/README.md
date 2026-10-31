# Portfolio 5: Distributed and Cloud Database Exercise

## Purpose

This activity continues the Nubian Research case study by deploying a three-member MongoDB replica set for synthetic research-paper data. It demonstrates how replication, majority consistency and primary election affect database availability when one member becomes unavailable.

The work is an independent academic deployment. It does not reproduce Nubian Research's production database, hosting provider, network topology, credentials, operational procedures, workload or records.

## Portfolio requirement

Portfolio 5 requires a distributed or cloud database discussion or setup based on the same case study, with evidence relating to concepts such as replication, sharding, availability, consistency or deployment.

This portfolio provides a working local distributed setup and evidence for deployment, replication, consistency, failover and recovery. Sharding is evaluated but deliberately not implemented.

## Selected exercise

MongoDB 8.0 runs as a replica set named `nubian-rs` across three Docker containers:

```text
mongo1 ─┐
mongo2 ─┼── replica set: nubian-rs
mongo3 ─┘
```

All three members store the same synthetic data. At a given time, one member accepts writes as the primary and the other two replicate those writes as secondaries. The members have equal voting priority, so the implementation discovers elected roles rather than assuming that a particular container must always be primary.

The detailed topology and consistency decisions are documented in [`distributed-design.md`](./distributed-design.md).

## Executed demonstrations

The implementation demonstrates:

1. Deploying and initialising three data-bearing replica-set members.
2. Writing a synthetic paper with majority write concern.
3. Verifying that the record reaches both secondary members.
4. Stopping the current primary and observing a new primary election.
5. Completing another majority-acknowledged write with one member unavailable.
6. Restarting the stopped member and verifying that it rejoins and catches up.

The failover target is discovered dynamically. The exercise does not hard-code which remaining member wins the election.

## Consistency and availability scope

A three-member replica set has a voting majority of two. It can therefore continue accepting writes after one member fails, following a brief election interval. If two members are unavailable, the remaining member cannot form a majority or elect itself primary, so majority writes stop rather than allowing two independent writable histories.

Demonstration writes request:

```javascript
{ w: "majority", j: true, wtimeout: 10000 }
```

Validation reads from secondary members use secondary read preference together with majority read concern. Replication is asynchronous, so the validation uses bounded readiness checks instead of claiming that every secondary is updated instantaneously.

## Sharding decision

Replication copies the same dataset between members to support redundancy and failover. Sharding partitions a dataset across multiple shards to address a different problem: horizontal data distribution.

This exercise has no measured dataset size, throughput requirement or justified shard key that would support a sharded design. Adding a sharded cluster would therefore increase operational complexity without answering the selected availability and consistency questions.

## Implementation and evidence

The deployment tranche provides:

- [`docker-compose.yml`](./docker-compose.yml), containing three MongoDB 8.0 members, separate persistent volumes and a private internal network with no published database ports.
- [`initialise-replica-set.js`](./mongodb/initialise-replica-set.js), which creates the exact replica-set configuration or safely validates it when rerun.
- [`validate-topology.js`](./mongodb/validate-topology.js), which verifies three data-bearing voters, a majority of two, one primary and two secondaries.
- [`topology-validation.txt`](./evidence/topology-validation.txt), containing the successful fresh, repeated and read-only validation output.
- [`seed-majority-write.js`](./mongodb/seed-majority-write.js), which resets the dedicated assessment collection and inserts one fixed paper using majority write concern and journalling.
- [`validate-replication.js`](./mongodb/validate-replication.js), which uses bounded direct-member reads to confirm the exact baseline dataset on all three members before failure.
- [`replication-validation.txt`](./evidence/replication-validation.txt), containing the successful majority-write and three-member replication results.
- [`run-failover-demo.sh`](./scripts/run-failover-demo.sh), which discovers and stops the current primary, waits for a replacement, performs a majority write, restarts the stopped member and invokes final validation.
- [`write-after-failover.js`](./mongodb/write-after-failover.js), which verifies the baseline record and performs the second majority-journalled write while one member is unavailable.
- [`validate-after-failover.js`](./mongodb/validate-after-failover.js), which waits within a fixed deadline for one primary, two secondaries and identical two-paper snapshots on all three members.
- [`failover-validation.txt`](./evidence/failover-validation.txt), containing the executed election, write, rejoin and catch-up results.

Each member limits its WiredTiger internal cache to `0.256` GB because three database processes share one laptop. This is a resource bound for the local exercise, not a production capacity recommendation.

The scripted implementation, text evidence and selected screenshots are complete.

## Evidence captured

The evidence shows:

- The three replica-set members and their elected roles.
- The same baseline document identifiers on all three members.
- A primary becoming unavailable and another member being elected.
- A successful majority write while two members remain available.
- The restarted member receiving the post-failover record.
- Final member roles and identical two-record snapshots.

### Screenshot evidence

- [`replica-set-baseline-validation.png`](./evidence/replica-set-baseline-validation.png) shows the initial three-member topology, majority-write seed and baseline replication checks.
- [`failover-majority-write-and-recovery.png`](./evidence/failover-majority-write-and-recovery.png) shows the replacement-primary election, post-failover majority write, restarted member and replicated records.
- [`failover-final-result.png`](./evidence/failover-final-result.png) records the final rejoin and successful completion messages.

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

### Seed and verify replication

Run the deterministic baseline write through a replica-set connection containing all three internal hosts:

```bash
docker compose \
  -f portfolio-5-distributed-cloud-301914822/docker-compose.yml \
  exec -T mongo1 \
  mongosh --quiet \
  "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=nubian-rs" \
  --file /portfolio5/mongodb/seed-majority-write.js
```

The seed script is safe to rerun. It resets only the dedicated Portfolio 5 `papers` collection before inserting the fixed baseline document.

Verify the document independently on the primary and both secondaries:

```bash
docker compose \
  -f portfolio-5-distributed-cloud-301914822/docker-compose.yml \
  exec -T mongo1 \
  mongosh --quiet \
  --file /portfolio5/mongodb/validate-replication.js
```

The validator uses secondary read preference, majority read concern and bounded per-member timeouts. Matching snapshots prove that each specific member applied the baseline document; majority write acknowledgement alone would establish only the required majority.

### Run the failover and recovery demonstration

Run the complete deterministic sequence:

```bash
portfolio-5-distributed-cloud-301914822/scripts/run-failover-demo.sh
```

The script first restores the one-paper baseline while all members are online, verifies that no stale post-failover record remains, and then discovers the current primary. It stops that member without deleting its volume, waits up to 60 seconds for a different primary, performs the second majority write, restarts the stopped member and verifies its catch-up. An exit trap attempts to restart the stopped member if the sequence is interrupted.

The command is safe to rerun against this assessment deployment. A repeat run successfully handled a different starting primary, confirming that member roles are discovered rather than fixed in the script.

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

Only fixed fictional records created for this assessment are used. No production or externally sourced dataset is copied into the deployment.

Authentication and transport encryption are omitted only inside a dedicated internal Docker network to keep the exercise reproducible. MongoDB ports are not published to the host, and `mongosh` validation commands run inside a replica-set container. A production deployment would require authenticated members, encrypted connections, managed secrets, access controls, monitoring and tested backup procedures.

## Scope and deployment boundary

This exercise runs three MongoDB members in separate containers on one laptop. It demonstrates replication, primary election and recovery from one database-member failure.

Because the containers share one physical host and network, it does not test host, availability-zone or regional failure. The results provide functional evidence of distributed-database behaviour, not a cloud performance or resilience benchmark.

In a production cloud deployment, members would be placed across independent failure domains. This portfolio discusses that mapping without using Nubian Research infrastructure or requiring a paid cloud account.
