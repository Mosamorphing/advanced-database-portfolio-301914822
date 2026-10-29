(() => {
  const portfolioDb = db.getSiblingDB("nubian_portfolio5");
  const collectionName = "papers";
  const writeConcern = {
    w: "majority",
    j: true,
    wtimeout: 10000
  };
  const baselinePaper = {
    _id: ObjectId("680000000000000000000001"),
    assessmentScope: "portfolio5",
    documentReference: "portfolio5/papers/replicated-paper-001.pdf",
    title: "Synthetic Replicated Research Paper",
    status: "published",
    replicationStage: "baseline",
    createdAt: ISODate("2026-03-01T10:00:00Z"),
    updatedAt: ISODate("2026-03-01T10:00:00Z")
  };

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const hello = db.getSiblingDB("admin").runCommand({ hello: 1 });
  assertCondition(
    hello.isWritablePrimary === true,
    "seed-majority-write.js must run through the elected primary"
  );

  print("Portfolio 5 majority-write seed");

  const resetResult = portfolioDb.runCommand({
    delete: collectionName,
    deletes: [{ q: {}, limit: 0 }],
    writeConcern
  });
  assertCondition(
    resetResult.ok === 1 && !resetResult.writeConcernError,
    `dataset reset was not majority acknowledged: ${EJSON.stringify(resetResult)}`
  );

  const insertResult = portfolioDb.runCommand({
    insert: collectionName,
    documents: [baselinePaper],
    ordered: true,
    writeConcern
  });
  assertCondition(
    insertResult.ok === 1 &&
      insertResult.n === 1 &&
      !insertResult.writeConcernError,
    `baseline insert was not majority acknowledged: ${EJSON.stringify(insertResult)}`
  );

  const verification = portfolioDb.runCommand({
    find: collectionName,
    filter: { _id: baselinePaper._id },
    projection: {
      _id: 1,
      documentReference: 1,
      title: 1,
      status: 1,
      replicationStage: 1
    },
    limit: 1,
    singleBatch: true,
    readConcern: { level: "majority" }
  });
  assertCondition(
    verification.ok === 1 && verification.cursor.firstBatch.length === 1,
    "majority read did not return the inserted baseline paper"
  );

  print("PASS deterministic assessment dataset reset with majority acknowledgement");
  print("PASS baseline paper inserted with majority acknowledgement and journalling");
  print("PASS baseline paper returned by a majority read");
  printjson({
    primary: hello.me ?? hello.primary,
    writeConcern,
    deletedDocuments: resetResult.n,
    insertedDocument: verification.cursor.firstBatch[0]
  });
  print("MAJORITY-WRITE SEED PASSED");
})();
