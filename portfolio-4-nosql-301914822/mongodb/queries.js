(() => {
  const portfolioDb = db.getSiblingDB("nubian_portfolio4");

  const ids = {
    detailPaper: ObjectId("660000000000000000000001"),
    pendingPaper: ObjectId("660000000000000000000005"),
    databaseCategory: ObjectId("660000000000000000000501"),
    openAccessKeyword: ObjectId("660000000000000000000601"),
    firstComment: ObjectId("660000000000000000000701")
  };

  const expectedOriginalAbstract =
    "A fictional pending paper used as a query-filtering control.";
  const revisedAbstract =
    "A revised fictional abstract produced by the Portfolio 4 update demonstration.";

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const objectIdKey = (value) => value.toHexString();

  const assertExactValues = (actual, expected, message) => {
    assertCondition(
      JSON.stringify(actual) === JSON.stringify(expected),
      `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  };

  const expectMongoError = (operation, expectedCode, message) => {
    try {
      operation();
    } catch (error) {
      assertCondition(
        error.code === expectedCode,
        `${message}: expected MongoDB error ${expectedCode}, received ${error.code}`
      );
      print(`PASS: ${message} (MongoDB error ${expectedCode})`);
      return;
    }

    throw new Error(`${message}: the operation unexpectedly succeeded`);
  };

  assertCondition(
    portfolioDb.papers.countDocuments({}) === 6 &&
      portfolioDb.comments.countDocuments({}) === 7,
    "expected deterministic dataset is missing; run seed-data.js first"
  );

  const pendingBeforeUpdate = portfolioDb.papers.findOne({
    _id: ids.pendingPaper
  });
  assertCondition(
    pendingBeforeUpdate?.abstract === expectedOriginalAbstract,
    "pending paper is not in its seeded state; rerun seed-data.js before queries.js"
  );
  const pendingBeforeUpdateSnapshot = EJSON.stringify(pendingBeforeUpdate, {
    relaxed: false
  });

  print("Portfolio 4 MongoDB query execution");

  print("\nQUERY 1 - Published paper detail");
  const paperDetail = portfolioDb.papers.findOne(
    { _id: ids.detailPaper, status: "published" },
    {
      _id: 0,
      documentReference: 1,
      title: 1,
      status: 1,
      classification: 1,
      authors: 1,
      keywords: 1
    }
  );
  assertCondition(paperDetail, "paper-detail query returned no document");
  assertCondition(
    paperDetail.classification.field.name === "Computing" &&
      paperDetail.classification.category.name === "Database Systems",
    "paper-detail query returned an unexpected classification"
  );
  assertExactValues(
    paperDetail.authors.map((author) => author.fullName),
    ["Ada Example", "Bola Example"],
    "paper-detail author order differs"
  );
  assertExactValues(
    paperDetail.keywords.map((keyword) => keyword.name),
    ["Open Access", "Document Databases"],
    "paper-detail keywords differ"
  );
  printjson(paperDetail);
  print("PASS: one paper read returned its embedded classification, authors and keywords");

  print("\nQUERY 2A - Published papers by category");
  const categoryResults = portfolioDb.papers
    .find(
      {
        status: "published",
        "classification.category.categoryId": ids.databaseCategory
      },
      {
        _id: 0,
        title: 1,
        status: 1,
        "classification.category.name": 1,
        submittedAt: 1
      }
    )
    .sort({ submittedAt: -1 })
    .toArray();
  assertExactValues(
    categoryResults.map((paper) => paper.title),
    [
      "Synthetic Query Planning for Research Discovery",
      "A Synthetic Study of Open Research Metadata"
    ],
    "category query result differs"
  );
  printjson(categoryResults);
  print("PASS: category query returned the two expected published papers");

  print("\nQUERY 2B - Published papers by keyword");
  const keywordResults = portfolioDb.papers
    .find(
      {
        status: "published",
        "keywords.keywordId": ids.openAccessKeyword
      },
      {
        _id: 0,
        title: 1,
        status: 1,
        keywords: 1,
        submittedAt: 1
      }
    )
    .sort({ submittedAt: -1 })
    .toArray();
  assertExactValues(
    keywordResults.map((paper) => paper.title),
    [
      "A Fictional Open Epidemiology Dataset",
      "Synthetic Query Planning for Research Discovery",
      "A Synthetic Study of Open Research Metadata"
    ],
    "keyword query result differs"
  );
  printjson(keywordResults);
  print("PASS: keyword query returned the three expected published papers");

  print("\nQUERY 3 - Validated single-document update");
  try {
    expectMongoError(
      () =>
        portfolioDb.papers.updateOne(
          { _id: ids.pendingPaper },
          { $set: { status: "archived" } }
        ),
      121,
      "schema validator rejected an unsupported paper status"
    );

    const afterRejectedUpdate = portfolioDb.papers.findOne({
      _id: ids.pendingPaper
    });
    assertCondition(
      afterRejectedUpdate.status === "pending" &&
        afterRejectedUpdate.abstract === expectedOriginalAbstract,
      "rejected update changed the pending paper"
    );

    const updateResult = portfolioDb.papers.updateOne(
      {
        _id: ids.pendingPaper,
        status: "pending",
        abstract: expectedOriginalAbstract
      },
      {
        $set: {
          abstract: revisedAbstract,
          updatedAt: ISODate("2026-02-01T10:00:00Z")
        }
      }
    );
    assertCondition(
      updateResult.matchedCount === 1 && updateResult.modifiedCount === 1,
      "pending paper update did not modify exactly one document"
    );
    const updatedPaper = portfolioDb.papers.findOne(
      { _id: ids.pendingPaper },
      {
        _id: 0,
        title: 1,
        status: 1,
        abstract: 1,
        updatedAt: 1
      }
    );
    assertCondition(
      updatedPaper.abstract === revisedAbstract &&
        updatedPaper.updatedAt.valueOf() ===
          ISODate("2026-02-01T10:00:00Z").valueOf(),
      "updated paper does not contain the expected revision"
    );
    printjson({
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      updatedPaper
    });
    print("PASS: valid update modified exactly one pending paper");
  } finally {
    const restoreResult = portfolioDb.papers.replaceOne(
      { _id: ids.pendingPaper },
      pendingBeforeUpdate
    );
    assertCondition(
      restoreResult.matchedCount === 1,
      "could not restore the pending paper after the update demonstration"
    );
    const restoredPaper = portfolioDb.papers.findOne({
      _id: ids.pendingPaper
    });
    assertCondition(
      EJSON.stringify(restoredPaper, { relaxed: false }) ===
        pendingBeforeUpdateSnapshot,
      "pending paper was not fully restored after the update demonstration"
    );
    print("PASS: update demonstration restored the original seeded document");
  }

  print("\nQUERY 4A - First page of comments for one paper");
  const selectedPaperCommentCount = portfolioDb.comments.countDocuments({
    paperId: ids.detailPaper
  });
  assertCondition(
    selectedPaperCommentCount === 5,
    "selected paper should have five comments"
  );
  const firstCommentPage = portfolioDb.comments
    .find(
      { paperId: ids.detailPaper },
      {
        _id: 1,
        parentCommentId: 1,
        author: 1,
        body: 1,
        createdAt: 1
      }
    )
    .sort({ createdAt: 1 })
    .limit(3)
    .toArray();
  assertExactValues(
    firstCommentPage.map((comment) => objectIdKey(comment._id)),
    [
      "660000000000000000000701",
      "660000000000000000000702",
      "660000000000000000000703"
    ],
    "first comment page differs"
  );
  printjson({ selectedPaperCommentCount, firstCommentPage });
  print("PASS: first chronological page returned three of five comments");

  print("\nQUERY 4B - Replies to one comment");
  const replyResults = portfolioDb.comments
    .find(
      {
        paperId: ids.detailPaper,
        parentCommentId: ids.firstComment
      },
      {
        _id: 1,
        parentCommentId: 1,
        author: 1,
        body: 1,
        createdAt: 1
      }
    )
    .sort({ createdAt: 1 })
    .toArray();
  assertExactValues(
    replyResults.map((comment) => objectIdKey(comment._id)),
    ["660000000000000000000702", "660000000000000000000703"],
    "reply query result differs"
  );
  printjson(replyResults);
  print("PASS: reply query returned the two expected child comments");

  print("\nQUERY 5 - Published papers by field");
  const aggregationResults = portfolioDb.papers
    .aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: {
            fieldId: "$classification.field.fieldId",
            fieldName: "$classification.field.name"
          },
          publishedPapers: { $sum: 1 }
        }
      },
      { $sort: { "_id.fieldName": 1 } },
      {
        $project: {
          _id: 0,
          field: "$_id.fieldName",
          publishedPapers: 1
        }
      }
    ])
    .toArray();
  assertExactValues(
    aggregationResults.map(
      (row) => `${row.field}:${row.publishedPapers}`
    ),
    ["Computing:2", "Environmental Science:1", "Public Health:1"],
    "field aggregation differs"
  );
  printjson(aggregationResults);
  print("PASS: aggregation returned the expected published-paper counts");

  print("\nQUERY DEMONSTRATION PASSED");
})();
