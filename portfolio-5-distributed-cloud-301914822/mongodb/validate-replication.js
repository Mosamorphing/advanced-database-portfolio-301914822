(() => {
  const databaseName = "nubian_portfolio5";
  const collectionName = "papers";
  const expectedPaperId = ObjectId("680000000000000000000001");
  const expectedHosts = [
    "mongo1:27017",
    "mongo2:27017",
    "mongo3:27017"
  ];
  const timeoutMs = 30000;
  const pollIntervalMs = 500;

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const memberClients = expectedHosts.map((host) => {
    const client = new Mongo(
      `mongodb://${host}/?directConnection=true&readPreference=secondaryPreferred&serverSelectionTimeoutMS=2000&connectTimeoutMS=2000&socketTimeoutMS=3000`
    );
    client.setReadPref("secondaryPreferred");
    return {
      host,
      client,
      adminDb: client.getDB("admin"),
      portfolioDb: client.getDB(databaseName)
    };
  });

  const readExpectedDataset = (member) => {
    const hello = member.adminDb.runCommand({ hello: 1 });
    const result = member.portfolioDb.runCommand({
      find: collectionName,
      filter: { assessmentScope: "portfolio5" },
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
      limit: 3,
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

  print("Portfolio 5 replication validation");

  const deadline = Date.now() + timeoutMs;
  let observations = [];

  while (Date.now() < deadline) {
    observations = memberClients.map((member) => {
      try {
        return {
          host: member.host,
          ...readExpectedDataset(member),
          error: null
        };
      } catch (error) {
        return {
          host: member.host,
          role: "UNKNOWN",
          papers: [],
          error: error.message
        };
      }
    });

    if (
      observations.every(
        (observation) =>
          observation.papers.length === 1 &&
          observation.papers[0]._id.equals(expectedPaperId) &&
          observation.papers[0].replicationStage === "baseline"
      )
    ) {
      break;
    }

    sleep(pollIntervalMs);
  }

  try {
    assertCondition(
      observations.every(
        (observation) =>
          observation.papers.length === 1 &&
          observation.papers[0]._id.equals(expectedPaperId) &&
          observation.papers[0].replicationStage === "baseline"
      ),
      `exact baseline dataset did not reach every member within ${timeoutMs} ms: ${EJSON.stringify(observations)}`
    );

    const primaryCount = observations.filter(
      (observation) => observation.role === "PRIMARY"
    ).length;
    const secondaryCount = observations.filter(
      (observation) => observation.role === "SECONDARY"
    ).length;
    assertCondition(
      primaryCount === 1 && secondaryCount === 2,
      "expected one primary and two secondaries during replication validation"
    );

    const snapshots = observations.map((observation) =>
      EJSON.stringify(observation.papers, { relaxed: false })
    );
    assertCondition(
      new Set(snapshots).size === 1,
      "replica-set members returned different baseline dataset snapshots"
    );

    print("PASS exact one-paper baseline dataset present on all three members");
    print("PASS no stale post-failover paper remains before the failure test");
    print("PASS one primary and two secondaries observed through direct member checks");
    print("PASS identical baseline paper snapshot returned by every member");
    printjson({
      readConcern: "majority",
      readPreference: "secondaryPreferred",
      members: observations.map((observation) => ({
        host: observation.host,
        role: observation.role,
        paperId: observation.papers[0]._id,
        replicationStage: observation.papers[0].replicationStage
      }))
    });
    print("REPLICATION VALIDATION PASSED");
  } finally {
    for (const member of memberClients) {
      if (typeof member.client.close === "function") {
        member.client.close();
      }
    }
  }
})();
