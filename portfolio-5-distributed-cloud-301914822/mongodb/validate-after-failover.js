(() => {
  const databaseName = "nubian_portfolio5";
  const collectionName = "papers";
  const expectedPapers = [
    {
      id: ObjectId("680000000000000000000001"),
      stage: "baseline"
    },
    {
      id: ObjectId("680000000000000000000002"),
      stage: "post-failover"
    }
  ];
  const expectedHosts = [
    "mongo1:27017",
    "mongo2:27017",
    "mongo3:27017"
  ];
  const timeoutMs = 60000;
  const pollIntervalMs = 1000;

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const memberClients = expectedHosts.map((host) => ({
    host,
    client: null,
    adminDb: null,
    portfolioDb: null
  }));

  const connectMember = (member) => {
    if (member.client !== null) {
      return;
    }

    const client = new Mongo(
      `mongodb://${member.host}/?directConnection=true&readPreference=secondaryPreferred&serverSelectionTimeoutMS=2000&connectTimeoutMS=2000&socketTimeoutMS=3000`
    );
    client.setReadPref("secondaryPreferred");
    member.client = client;
    member.adminDb = client.getDB("admin");
    member.portfolioDb = client.getDB(databaseName);
  };

  const disconnectMember = (member) => {
    if (member.client !== null && typeof member.client.close === "function") {
      member.client.close();
    }
    member.client = null;
    member.adminDb = null;
    member.portfolioDb = null;
  };

  const observeMember = (member) => {
    connectMember(member);
    const hello = member.adminDb.runCommand({ hello: 1 });
    const result = member.portfolioDb.runCommand({
      find: collectionName,
      filter: { _id: { $in: expectedPapers.map((paper) => paper.id) } },
      projection: {
        _id: 1,
        assessmentScope: 1,
        documentReference: 1,
        title: 1,
        status: 1,
        replicationStage: 1,
        createdAt: 1,
        updatedAt: 1
      },
      sort: { _id: 1 },
      limit: expectedPapers.length,
      singleBatch: true,
      maxTimeMS: 2000,
      readConcern: { level: "majority" },
      $readPreference: { mode: "secondaryPreferred" }
    });

    assertCondition(result.ok === 1, `read failed on ${member.host}`);
    return {
      role: hello.isWritablePrimary
        ? "PRIMARY"
        : hello.secondary
          ? "SECONDARY"
          : "OTHER",
      papers: result.cursor.firstBatch
    };
  };

  print("Portfolio 5 post-failover and rejoin validation");

  const deadline = Date.now() + timeoutMs;
  let observations = [];

  while (Date.now() < deadline) {
    observations = memberClients.map((member) => {
      try {
        return {
          host: member.host,
          ...observeMember(member),
          error: null
        };
      } catch (error) {
        disconnectMember(member);
        return {
          host: member.host,
          role: "UNKNOWN",
          papers: [],
          error: error.message
        };
      }
    });

    const primaryCount = observations.filter(
      (observation) => observation.role === "PRIMARY"
    ).length;
    const secondaryCount = observations.filter(
      (observation) => observation.role === "SECONDARY"
    ).length;
    const allDocumentsPresent = observations.every(
      (observation) => observation.papers.length === expectedPapers.length
    );

    if (primaryCount === 1 && secondaryCount === 2 && allDocumentsPresent) {
      break;
    }

    sleep(pollIntervalMs);
  }

  try {
    const primaryCount = observations.filter(
      (observation) => observation.role === "PRIMARY"
    ).length;
    const secondaryCount = observations.filter(
      (observation) => observation.role === "SECONDARY"
    ).length;
    assertCondition(
      primaryCount === 1 && secondaryCount === 2,
      `full topology did not recover within ${timeoutMs} ms: ${EJSON.stringify(observations)}`
    );
    assertCondition(
      observations.every(
        (observation) => observation.papers.length === expectedPapers.length
      ),
      `both papers did not reach every member within ${timeoutMs} ms: ${EJSON.stringify(observations)}`
    );

    const snapshots = observations.map((observation) =>
      EJSON.stringify(observation.papers, { relaxed: false })
    );
    assertCondition(
      new Set(snapshots).size === 1,
      "replica-set members returned different post-failover snapshots"
    );

    for (const observation of observations) {
      const stages = observation.papers.map((paper) => paper.replicationStage);
      assertCondition(
        JSON.stringify(stages) ===
          JSON.stringify(expectedPapers.map((paper) => paper.stage)),
        `${observation.host} returned unexpected replication stages ${JSON.stringify(stages)}`
      );
    }

    print("PASS one primary and two secondaries healthy after member restart");
    print("PASS baseline and post-failover papers present on all three members");
    print("PASS identical two-paper snapshot returned by every member");
    printjson({
      readConcern: "majority",
      readPreference: "secondaryPreferred",
      members: observations.map((observation) => ({
        host: observation.host,
        role: observation.role,
        papers: observation.papers.map((paper) => ({
          paperId: paper._id,
          replicationStage: paper.replicationStage
        }))
      }))
    });
    print("POST-FAILOVER REJOIN VALIDATION PASSED");
  } finally {
    for (const member of memberClients) {
      disconnectMember(member);
    }
  }
})();
