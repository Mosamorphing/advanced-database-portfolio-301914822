# Distributed Database Design

## Objective

The exercise evaluates whether a replicated database can preserve one consistent writable history and continue serving majority-acknowledged writes after one database member fails. The workload uses a small, deterministic set of fictional Nubian Research paper records so that topology and failure behaviour remain the focus.

This is a local assessment architecture, not a production migration proposal.

## Topology

```text
                         Docker network
        ┌──────────────────────────────────────────┐
        │                                          │
        │  mongo1:27017  ─┐                        │
client*─┼─ mongo2:27017  ─┼─ replica set nubian-rs│
        │  mongo3:27017  ─┘                        │
        │                                          │
        └──────────────────────────────────────────┘
             │              │              │
          volume 1       volume 2       volume 3
```

`client*` represents `mongosh` running inside a replica-set container on the private Docker network. The database ports are not published to the macOS host.

Each container is a voting, data-bearing member with its own persistent volume. No arbiter is needed because all three members store data and collectively provide an odd number of votes.

Because three `mongod` processes share one laptop, each member limits its WiredTiger internal cache to `0.256` GB. This prevents the local exercise from treating host memory as though each container were the only database process; it is not a production sizing recommendation.

The internal client connection string lists all three Docker hostnames and the replica-set name. That allows the MongoDB client to discover the current primary after an election instead of sending writes to one permanently fixed hostname.

## Member roles and majority

Under normal operation, the replica set contains one primary and two secondaries. The primary accepts writes and records them in the operation log. Secondaries apply that ordered operation stream to their own copies of the dataset.

With three voting members, two votes form a majority:

| Available members | Expected write state | Reason |
| --- | --- | --- |
| Three | Writable | A primary and majority are available. |
| Two | Writable after election | The remaining two members can form a majority. |
| One | Not writable as a replica set | One member cannot form a majority or elect a primary. |

The exercise stops only one member. The two-member-loss case is explained rather than introduced into the practical run.

## Write consistency

Both demonstration inserts request majority acknowledgement, journalling and a bounded acknowledgement timeout:

```javascript
{
  writeConcern: {
    w: "majority",
    j: true,
    wtimeout: 10000
  }
}
```

The write is treated as successfully acknowledged only after the required majority has confirmed it. This makes the test meaningful when the current primary is stopped: an acknowledged write should be present on the majority from which a replacement primary can be elected.

The timeout prevents the demonstration from waiting indefinitely if a majority cannot be reached. A timeout is evidence that acknowledgement was not obtained; it is not by itself proof that the database never applied the write, so validation checks the resulting records explicitly.

## Read consistency

Replication to secondary members is asynchronous and may lag behind the primary. Direct secondary validation therefore selects a secondary through read preference, requests majority read concern and uses bounded polling for the expected fixed identifiers.

The implementation does not claim that a secondary read is instantly current. It distinguishes:

- replication eventually delivering an operation to each healthy member;
- majority acknowledgement confirming that the required voting majority accepted a write; and
- a specific secondary having applied that operation by the time it is queried.

## Availability and failover sequence

The failover demonstration follows this sequence:

1. Start all three containers and initialise `nubian-rs`.
2. Wait until one primary and two secondaries are healthy.
3. Insert a baseline synthetic paper using majority write concern.
4. Verify the baseline identifier on every member.
5. Discover and record the current primary.
6. Stop that member without deleting its persistent volume.
7. Wait, with a timeout, until one remaining member reports itself as primary.
8. Insert a second synthetic paper through the multi-host replica-set connection.
9. Restart the stopped member.
10. Wait until it rejoins and verify that it contains both paper identifiers.

The election causes a temporary interruption rather than zero downtime. The evidence records member roles and data state before and after the interruption; it does not infer production recovery time from a local laptop run.

## Partition and consistency behaviour

If communication divides the members, only the side that can form a majority can elect or retain a writable primary. A minority member cannot independently accept normal replica-set writes. For this workload, that behaviour favours a single consistent write history over write availability on every isolated member.

This statement is limited to the configured majority-write exercise. It is not a general benchmark or a claim that every possible MongoDB read configuration provides identical consistency.

## Replication versus sharding

| Concept | Primary purpose | Decision for this exercise |
| --- | --- | --- |
| Replication | Maintain redundant copies and support election/failover. | Selected for implementation and testing. |
| Sharding | Partition data across shards for horizontal distribution. | Discussed but not implemented. |

A useful shard key depends on actual data volume, access patterns, distribution and growth. The fixed assessment dataset provides none of the evidence needed to justify that choice. A replica set answers the selected failure and consistency questions with substantially less machinery.

## Local-to-cloud mapping

| Local exercise | Conceptual managed-cloud equivalent |
| --- | --- |
| Three MongoDB containers | Three data-bearing database members. |
| Docker network | Private database network. |
| Separate named volumes | Persistent storage attached to each member. |
| Stopping one container | Simulated database-member failure. |
| Replica-set election | Primary replacement by the database control mechanism. |

The mapping is conceptual. Because all containers share one laptop, it does not test host, zone or regional resilience. A real cloud design would place members across independent failure domains and add authentication, TLS, secret management, backups, monitoring and capacity planning.

## Success criteria

The practical exercise succeeds only if the captured evidence confirms all of the following:

- exactly three configured data-bearing members;
- one primary and two secondaries before the simulated failure;
- the baseline record present on all members;
- a new primary elected after the original primary stops;
- the post-failover majority write acknowledged while two members are available;
- the restarted member rejoining and containing both expected records; and
- no real Nubian Research data, credentials or infrastructure details in the implementation or evidence.

## Executed result

The complete workflow passed twice. In the recorded repeat run, `mongo2` began as primary, the script stopped it without deleting its volume, and `mongo1` was elected as the replacement. The second paper was acknowledged with majority write concern while only `mongo1` and `mongo3` were available. After `mongo2` restarted, direct bounded checks reported one primary, two secondaries and the same two-paper snapshot on every member.

These results satisfy the database-member failure criteria only. They do not establish physical-host or cloud-region resilience because all containers ran on one laptop.

## References

- [MongoDB: Three Member Replica Sets](https://www.mongodb.com/docs/manual/core/replica-set-architecture-three-members/)
- [MongoDB: Replica Set Deployment Architectures](https://www.mongodb.com/docs/manual/core/replica-set-architectures/)
- [MongoDB: Write Concern](https://www.mongodb.com/docs/manual/reference/write-concern/)
- [MongoDB: Read Concern `"majority"`](https://www.mongodb.com/docs/manual/reference/read-concern-majority/)
- [MongoDB: WiredTiger cache configuration](https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.wiredTiger.engineConfig.cacheSizeGB)
