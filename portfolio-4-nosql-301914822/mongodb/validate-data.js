(() => {
  const portfolioDb = db.getSiblingDB("nubian_portfolio4");

  const expected = {
    paperIds: [
      "660000000000000000000001",
      "660000000000000000000002",
      "660000000000000000000003",
      "660000000000000000000004",
      "660000000000000000000005",
      "660000000000000000000006"
    ],
    commentIds: [
      "660000000000000000000701",
      "660000000000000000000702",
      "660000000000000000000703",
      "660000000000000000000704",
      "660000000000000000000705",
      "660000000000000000000706",
      "660000000000000000000707"
    ],
    references: [
      "portfolio4/papers/synthetic-paper-001.pdf",
      "portfolio4/papers/synthetic-paper-002.pdf",
      "portfolio4/papers/synthetic-paper-003.pdf",
      "portfolio4/papers/synthetic-paper-004.pdf",
      "portfolio4/papers/synthetic-paper-005.pdf",
      "portfolio4/papers/synthetic-paper-006.pdf"
    ]
  };

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const objectIdKey = (value) => value.toHexString();

  const assertExactStrings = (actual, expectedValues, message) => {
    assertCondition(
      JSON.stringify(actual) === JSON.stringify(expectedValues),
      `${message}: expected ${JSON.stringify(expectedValues)}, received ${JSON.stringify(actual)}`
    );
  };

  const registerSnapshot = (registry, id, snapshot, label) => {
    const key = objectIdKey(id);
    const serialised = EJSON.stringify(snapshot);
    if (registry.has(key)) {
      assertCondition(
        registry.get(key) === serialised,
        `${label} ${key} has inconsistent embedded snapshots`
      );
    } else {
      registry.set(key, serialised);
    }
  };

  const papers = portfolioDb.papers.find({}).toArray();
  const comments = portfolioDb.comments.find({}).toArray();

  print("Portfolio 4 deterministic seed validation");

  assertCondition(papers.length === 6, `expected 6 papers, received ${papers.length}`);
  assertCondition(
    comments.length === 7,
    `expected 7 comments, received ${comments.length}`
  );
  print("PASS exact dataset counts: 6 papers, 7 comments");

  assertExactStrings(
    papers.map((paper) => objectIdKey(paper._id)).sort(),
    [...expected.paperIds].sort(),
    "paper identifiers differ"
  );
  assertExactStrings(
    comments.map((comment) => objectIdKey(comment._id)).sort(),
    [...expected.commentIds].sort(),
    "comment identifiers differ"
  );
  assertExactStrings(
    papers.map((paper) => paper.documentReference).sort(),
    [...expected.references].sort(),
    "document references differ"
  );
  print("PASS all fixed identifiers and document references are present");

  const statusCounts = { pending: 0, published: 0, rejected: 0 };
  for (const paper of papers) {
    statusCounts[paper.status] += 1;
  }
  assertCondition(
    statusCounts.published === 4 &&
      statusCounts.pending === 1 &&
      statusCounts.rejected === 1,
    `unexpected status distribution ${JSON.stringify(statusCounts)}`
  );
  print("PASS status distribution: 4 published, 1 pending, 1 rejected");

  const paperById = new Map(
    papers.map((paper) => [objectIdKey(paper._id), paper])
  );
  const commentById = new Map(
    comments.map((comment) => [objectIdKey(comment._id), comment])
  );

  const fieldSnapshots = new Map();
  const categorySnapshots = new Map();
  const keywordSnapshots = new Map();
  const authorSnapshots = new Map();
  const institutionSnapshots = new Map();
  const authorByUser = new Map();
  const authorByOrcid = new Map();

  for (const paper of papers) {
    assertCondition(
      paper.updatedAt.getTime() >= paper.submittedAt.getTime(),
      `paper ${paper._id} has invalid timestamp order`
    );

    const paperAuthorIds = paper.authors.map((author) =>
      objectIdKey(author.authorId)
    );
    const paperKeywordIds = paper.keywords.map((keyword) =>
      objectIdKey(keyword.keywordId)
    );
    assertCondition(
      new Set(paperAuthorIds).size === paperAuthorIds.length,
      `paper ${paper._id} contains a duplicate authorId`
    );
    assertCondition(
      new Set(paperKeywordIds).size === paperKeywordIds.length,
      `paper ${paper._id} contains a duplicate keywordId`
    );

    const correspondingAuthors = paper.authors.filter(
      (author) => author.isCorrespondingAuthor
    ).length;
    assertCondition(
      correspondingAuthors === 1,
      `paper ${paper._id} does not follow the seed convention of one corresponding author`
    );

    registerSnapshot(
      fieldSnapshots,
      paper.classification.field.fieldId,
      { name: paper.classification.field.name },
      "field"
    );
    registerSnapshot(
      categorySnapshots,
      paper.classification.category.categoryId,
      {
        name: paper.classification.category.name,
        fieldId: paper.classification.field.fieldId
      },
      "category"
    );

    for (const keyword of paper.keywords) {
      registerSnapshot(
        keywordSnapshots,
        keyword.keywordId,
        { name: keyword.name },
        "keyword"
      );
    }

    for (const author of paper.authors) {
      registerSnapshot(
        authorSnapshots,
        author.authorId,
        {
          userId: author.userId,
          fullName: author.fullName,
          orcid: author.orcid,
          institution: author.institution
        },
        "author"
      );

      if (author.institution !== null) {
        registerSnapshot(
          institutionSnapshots,
          author.institution.institutionId,
          { name: author.institution.name },
          "institution"
        );
      }

      if (author.userId !== null) {
        const userKey = objectIdKey(author.userId);
        const authorKey = objectIdKey(author.authorId);
        if (authorByUser.has(userKey)) {
          assertCondition(
            authorByUser.get(userKey) === authorKey,
            `user ${userKey} maps to multiple author identifiers`
          );
        } else {
          authorByUser.set(userKey, authorKey);
        }
      }

      if (author.orcid !== null) {
        const authorKey = objectIdKey(author.authorId);
        if (authorByOrcid.has(author.orcid)) {
          assertCondition(
            authorByOrcid.get(author.orcid) === authorKey,
            `ORCID ${author.orcid} maps to multiple author identifiers`
          );
        } else {
          authorByOrcid.set(author.orcid, authorKey);
        }
      }
    }
  }
  print("PASS paper dates, embedded identifier uniqueness, and corresponding-author seed convention");
  print("PASS denormalised field, category, keyword, author, and institution snapshots are initially consistent");

  assertCondition(fieldSnapshots.size === 3, "expected three research fields");
  assertCondition(categorySnapshots.size === 3, "expected three categories");
  print("PASS dataset covers 3 fields and 3 categories");

  const commentAuthorSnapshots = new Map();
  const commentsPerPaper = new Map();
  let topLevelComments = 0;
  let replies = 0;

  for (const comment of comments) {
    const paperKey = objectIdKey(comment.paperId);
    const paper = paperById.get(paperKey);
    assertCondition(paper, `comment ${comment._id} references a missing paper`);
    assertCondition(
      paper.status === "published",
      `comment ${comment._id} does not follow the seed convention of referencing a published paper`
    );
    assertCondition(
      comment.updatedAt.getTime() >= comment.createdAt.getTime(),
      `comment ${comment._id} has invalid timestamp order`
    );

    commentsPerPaper.set(paperKey, (commentsPerPaper.get(paperKey) ?? 0) + 1);
    registerSnapshot(
      commentAuthorSnapshots,
      comment.author.userId,
      { displayName: comment.author.displayName },
      "comment author"
    );

    if (comment.parentCommentId === null) {
      topLevelComments += 1;
      continue;
    }

    replies += 1;
    const parentKey = objectIdKey(comment.parentCommentId);
    const parent = commentById.get(parentKey);
    assertCondition(parent, `comment ${comment._id} references a missing parent`);
    assertCondition(
      objectIdKey(comment._id) !== parentKey,
      `comment ${comment._id} references itself as parent`
    );
    assertCondition(
      objectIdKey(parent.paperId) === paperKey,
      `comment ${comment._id} and its parent belong to different papers`
    );
    assertCondition(
      comment.createdAt.getTime() >= parent.createdAt.getTime(),
      `comment ${comment._id} predates its parent`
    );
  }

  assertCondition(topLevelComments === 4, "expected four top-level comments");
  assertCondition(replies === 3, "expected three replies");
  assertCondition(
    commentsPerPaper.get("660000000000000000000001") === 5 &&
      commentsPerPaper.get("660000000000000000000002") === 1 &&
      commentsPerPaper.get("660000000000000000000003") === 1,
    "unexpected comment distribution"
  );
  print("PASS all comments reference published papers and have valid timestamps");
  print("PASS parent references exist, are non-self, and remain within the same paper");
  print("PASS comment distribution: 4 top-level, 3 replies across 3 papers");

  const databaseCategoryResults = portfolioDb.papers
    .find({
      status: "published",
      "classification.category.categoryId": ObjectId(
        "660000000000000000000501"
      )
    })
    .sort({ submittedAt: -1 })
    .toArray()
    .map((paper) => objectIdKey(paper._id));
  assertExactStrings(
    databaseCategoryResults,
    ["660000000000000000000002", "660000000000000000000001"],
    "published Database Systems result differs"
  );

  const openAccessResults = portfolioDb.papers
    .find({
      status: "published",
      "keywords.keywordId": ObjectId("660000000000000000000601")
    })
    .sort({ submittedAt: -1 })
    .toArray()
    .map((paper) => objectIdKey(paper._id));
  assertExactStrings(
    openAccessResults,
    [
      "660000000000000000000003",
      "660000000000000000000002",
      "660000000000000000000001"
    ],
    "published Open Access result differs"
  );
  print("PASS category and keyword targets include only the expected published papers");

  const publishedByField = portfolioDb.papers
    .aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$classification.field.name",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
    .toArray()
    .map((row) => `${row._id}:${row.count}`);
  assertExactStrings(
    publishedByField,
    ["Computing:2", "Environmental Science:1", "Public Health:1"],
    "published field aggregation differs"
  );
  print("PASS published aggregation: Computing 2, Environmental Science 1, Public Health 1");

  print("DATA VALIDATION PASSED");
})();
