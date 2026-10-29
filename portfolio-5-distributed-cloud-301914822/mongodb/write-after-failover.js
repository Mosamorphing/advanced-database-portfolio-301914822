(() => {
  const portfolioDb = db.getSiblingDB("nubian_portfolio5");
  const collectionName = "papers";
  const baselinePaperId = ObjectId("680000000000000000000001");
  const postFailoverPaper = {
    _id: ObjectId("680000000000000000000002"),
    assessmentScope: "portfolio5",
    documentReference: "portfolio5/papers/post-failover-paper-002.pdf",
    title: "Synthetic Paper Written After Primary Election",
    status: "published",
    replicationStage: "post-failover",
    createdAt: ISODate("2026-03-02T10:00:00Z"),
    updatedAt: ISODate("2026-03-02T10:00:00Z")
  };
  const writeConcern = {
    w: "majority",
    j: true,
    wtimeout: 10000
  };

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const adminDb = db.getSiblingDB("admin");
  const hello = adminDb.runCommand({ hello: 1 });
  assertCondition(
    hello.isWritablePrimary === true,
    "write-after-failover.js must be routed to the newly elected primary"
  );

  const baselineRead = portfolioDb.runCommand({
    find: collectionName,
    filter: { _id: baselinePaperId },
    limit: 1,
    singleBatch: true,
    maxTimeMS: 2000,
    readConcern: { level: "majority" }
  });
  assertCondition(
    baselineRead.ok === 1 && baselineRead.cursor.firstBatch.length === 1,
    "baseline paper is missing before the post-failover write"
  );

  print("Portfolio 5 post-failover majority write");

  const resetResult = portfolioDb.runCommand({
    delete: collectionName,
    deletes: [{ q: { _id: postFailoverPaper._id }, limit: 1 }],
    writeConcern
  });
  assertCondition(
    resetResult.ok === 1 && !resetResult.writeConcernError,
    `post-failover reset was not majority acknowledged: ${EJSON.stringify(resetResult)}`
  );

  const insertResult = portfolioDb.runCommand({
    insert: collectionName,
    documents: [postFailoverPaper],
    ordered: true,
    writeConcern
  });
  assertCondition(
    insertResult.ok === 1 &&
      insertResult.n === 1 &&
      !insertResult.writeConcernError,
    `post-failover insert was not majority acknowledged: ${EJSON.stringify(insertResult)}`
  );

  const verification = portfolioDb.runCommand({
    find: collectionName,
    filter: { _id: { $in: [baselinePaperId, postFailoverPaper._id] } },
    projection: {
      _id: 1,
      title: 1,
      status: 1,
      replicationStage: 1
    },
    sort: { _id: 1 },
    limit: 2,
    singleBatch: true,
    maxTimeMS: 2000,
    readConcern: { level: "majority" }
  });
  assertCondition(
    verification.ok === 1 && verification.cursor.firstBatch.length === 2,
    "majority read did not return both expected papers after failover"
  );

  print("PASS baseline majority-committed paper retained after primary election");
  print("PASS post-failover paper inserted with majority acknowledgement and journalling");
  print("PASS both expected papers returned by a majority read");
  printjson({
    electedPrimary: hello.me ?? hello.primary,
    writeConcern,
    removedPreviousPostFailoverDocuments: resetResult.n,
    papers: verification.cursor.firstBatch
  });
  print("POST-FAILOVER MAJORITY WRITE PASSED");
})();
