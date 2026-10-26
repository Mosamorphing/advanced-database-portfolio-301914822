(() => {
  const portfolioDb = db.getSiblingDB("nubian_portfolio4");

  const expectedPaperIndexes = [
    {
      name: "uq_papers_document_reference",
      key: { documentReference: 1 },
      unique: true
    },
    {
      name: "papers_status_category_submitted_at",
      key: {
        status: 1,
        "classification.category.categoryId": 1,
        submittedAt: -1
      }
    },
    {
      name: "papers_keyword_status",
      key: { "keywords.keywordId": 1, status: 1 }
    }
  ];
  const expectedCommentIndexes = [
    {
      name: "comments_paper_created_at",
      key: { paperId: 1, createdAt: 1 }
    },
    {
      name: "comments_paper_parent_created_at",
      key: { paperId: 1, parentCommentId: 1, createdAt: 1 }
    }
  ];

  const validationIds = {
    paper: ObjectId(),
    invalidPaper: ObjectId(),
    duplicatePaper: ObjectId(),
    topLevelComment: ObjectId(),
    reply: ObjectId(),
    invalidComment: ObjectId(),
    submitter: ObjectId(),
    reader: ObjectId(),
    author: ObjectId(),
    institution: ObjectId(),
    field: ObjectId(),
    category: ObjectId(),
    keyword: ObjectId()
  };

  const validationReference =
    `validation/${validationIds.paper.valueOf()}.pdf`;

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  const expectMongoError = (label, expectedCode, operation) => {
    try {
      operation();
    } catch (error) {
      assertCondition(
        error.code === expectedCode,
        `${label}: expected error ${expectedCode}, received ${error.code}`
      );
      print(`PASS ${label} (code ${expectedCode})`);
      return;
    }

    throw new Error(`${label}: operation unexpectedly succeeded`);
  };

  const assertIndexUsed = (label, explainResult, expectedIndex) => {
    const planText = EJSON.stringify(explainResult.queryPlanner.winningPlan);
    assertCondition(
      planText.includes("IXSCAN") && planText.includes(expectedIndex),
      `${label}: expected IXSCAN using ${expectedIndex}`
    );
    print(`PASS ${label} index usability: IXSCAN ${expectedIndex}`);
  };

  const validPaper = {
    _id: validationIds.paper,
    documentReference: validationReference,
    submittedByUserId: validationIds.submitter,
    title: "Temporary Synthetic Validation Paper",
    abstract: "A temporary fictional paper used to validate the Portfolio 4 model.",
    status: "published",
    classification: {
      field: {
        fieldId: validationIds.field,
        name: "Synthetic Computing"
      },
      category: {
        categoryId: validationIds.category,
        name: "Synthetic Document Databases"
      }
    },
    authors: [
      {
        authorId: validationIds.author,
        userId: validationIds.submitter,
        fullName: "Synthetic Validation Author",
        orcid: null,
        institution: {
          institutionId: validationIds.institution,
          name: "Synthetic Validation Institute"
        },
        isCorrespondingAuthor: true
      }
    ],
    keywords: [
      {
        keywordId: validationIds.keyword,
        name: "Synthetic Validation"
      }
    ],
    submittedAt: ISODate("2026-01-20T10:00:00Z"),
    updatedAt: ISODate("2026-01-20T10:00:00Z")
  };

  const validTopLevelComment = {
    _id: validationIds.topLevelComment,
    paperId: validationIds.paper,
    author: {
      userId: validationIds.reader,
      displayName: "Synthetic Validation Reader"
    },
    parentCommentId: null,
    body: "A temporary valid comment.",
    createdAt: ISODate("2026-01-20T11:00:00Z"),
    updatedAt: ISODate("2026-01-20T11:00:00Z")
  };

  const validReply = {
    _id: validationIds.reply,
    paperId: validationIds.paper,
    author: {
      userId: validationIds.submitter,
      displayName: "Synthetic Validation Author"
    },
    parentCommentId: validationIds.topLevelComment,
    body: "A temporary valid reply.",
    createdAt: ISODate("2026-01-20T12:00:00Z"),
    updatedAt: ISODate("2026-01-20T12:00:00Z")
  };

  let modelValidationPassed = false;

  print("Portfolio 4 model validation");

  try {
    const papersInfo = portfolioDb.getCollectionInfos({ name: "papers" })[0];
    const commentsInfo = portfolioDb.getCollectionInfos({ name: "comments" })[0];

    assertCondition(
      papersInfo?.options?.validator?.$jsonSchema,
      "papers $jsonSchema validator is missing"
    );
    assertCondition(
      papersInfo.options.validationLevel === "strict" &&
        papersInfo.options.validationAction === "error",
      "papers validator is not strict/error"
    );
    print("PASS papers $jsonSchema validator configured as strict/error");

    assertCondition(
      commentsInfo?.options?.validator?.$jsonSchema,
      "comments $jsonSchema validator is missing"
    );
    assertCondition(
      commentsInfo.options.validationLevel === "strict" &&
        commentsInfo.options.validationAction === "error",
      "comments validator is not strict/error"
    );
    print("PASS comments $jsonSchema validator configured as strict/error");

    const paperIndexes = portfolioDb.papers.getIndexes();
    const commentIndexes = portfolioDb.comments.getIndexes();

    assertCondition(
      paperIndexes.length === expectedPaperIndexes.length + 1,
      "papers collection has an unexpected index count"
    );
    for (const expectedIndex of expectedPaperIndexes) {
      const actualIndex = paperIndexes.find(
        (index) => index.name === expectedIndex.name
      );
      assertCondition(
        actualIndex,
        `missing paper index ${expectedIndex.name}`
      );
      assertCondition(
        EJSON.stringify(actualIndex.key) === EJSON.stringify(expectedIndex.key),
        `paper index ${expectedIndex.name} has unexpected keys`
      );
      if (expectedIndex.unique === true) {
        assertCondition(
          actualIndex.unique === true,
          `paper index ${expectedIndex.name} is not unique`
        );
      }
    }
    print("PASS exact paper indexes configured (3 custom + _id)");

    assertCondition(
      commentIndexes.length === expectedCommentIndexes.length + 1,
      "comments collection has an unexpected index count"
    );
    for (const expectedIndex of expectedCommentIndexes) {
      const actualIndex = commentIndexes.find(
        (index) => index.name === expectedIndex.name
      );
      assertCondition(
        actualIndex,
        `missing comment index ${expectedIndex.name}`
      );
      assertCondition(
        EJSON.stringify(actualIndex.key) === EJSON.stringify(expectedIndex.key),
        `comment index ${expectedIndex.name} has unexpected keys`
      );
    }
    print("PASS exact comment indexes configured (2 custom + _id)");

    portfolioDb.papers.insertOne(validPaper);
    print("PASS valid paper accepted");

    expectMongoError("invalid paper rejected", 121, () => {
      portfolioDb.papers.insertOne({
        ...validPaper,
        _id: validationIds.invalidPaper,
        documentReference:
          `validation/${validationIds.invalidPaper.valueOf()}.pdf`,
        status: "archived"
      });
    });

    portfolioDb.comments.insertMany([validTopLevelComment, validReply]);
    print("PASS valid top-level comment and reply accepted");

    expectMongoError("invalid comment rejected", 121, () => {
      portfolioDb.comments.insertOne({
        _id: validationIds.invalidComment,
        paperId: validationIds.paper,
        author: {
          userId: validationIds.reader,
          displayName: "Synthetic Validation Reader"
        },
        parentCommentId: null,
        createdAt: ISODate("2026-01-20T13:00:00Z"),
        updatedAt: ISODate("2026-01-20T13:00:00Z")
      });
    });

    expectMongoError("duplicate documentReference rejected", 11000, () => {
      portfolioDb.papers.insertOne({
        ...validPaper,
        _id: validationIds.duplicatePaper
      });
    });

    assertIndexUsed(
      "published-category query",
      portfolioDb.papers
        .find({
          status: "published",
          "classification.category.categoryId": validationIds.category
        })
        .sort({ submittedAt: -1 })
        .hint("papers_status_category_submitted_at")
        .explain("executionStats"),
      "papers_status_category_submitted_at"
    );

    assertIndexUsed(
      "keyword query",
      portfolioDb.papers
        .find({
          "keywords.keywordId": validationIds.keyword,
          status: "published"
        })
        .hint("papers_keyword_status")
        .explain("executionStats"),
      "papers_keyword_status"
    );

    assertIndexUsed(
      "paper comments query",
      portfolioDb.comments
        .find({ paperId: validationIds.paper })
        .sort({ createdAt: 1 })
        .hint("comments_paper_created_at")
        .explain("executionStats"),
      "comments_paper_created_at"
    );

    assertIndexUsed(
      "comment replies query",
      portfolioDb.comments
        .find({
          paperId: validationIds.paper,
          parentCommentId: validationIds.topLevelComment
        })
        .sort({ createdAt: 1 })
        .hint("comments_paper_parent_created_at")
        .explain("executionStats"),
      "comments_paper_parent_created_at"
    );

    modelValidationPassed = true;
  } finally {
    portfolioDb.comments.deleteMany({
      _id: {
        $in: [
          validationIds.topLevelComment,
          validationIds.reply,
          validationIds.invalidComment
        ]
      }
    });
    portfolioDb.papers.deleteMany({
      _id: {
        $in: [
          validationIds.paper,
          validationIds.invalidPaper,
          validationIds.duplicatePaper
        ]
      }
    });

    const remainingPapers = portfolioDb.papers.countDocuments({
      _id: {
        $in: [
          validationIds.paper,
          validationIds.invalidPaper,
          validationIds.duplicatePaper
        ]
      }
    });
    const remainingComments = portfolioDb.comments.countDocuments({
      _id: {
        $in: [
          validationIds.topLevelComment,
          validationIds.reply,
          validationIds.invalidComment
        ]
      }
    });
    assertCondition(
      remainingPapers === 0 && remainingComments === 0,
      "temporary validation fixtures were not fully removed"
    );
    print("PASS temporary validation fixtures removed");
    printjson({
      cleanupVerification: {
        temporaryPapers: remainingPapers,
        temporaryComments: remainingComments
      }
    });
  }

  if (modelValidationPassed) {
    print("MODEL VALIDATION PASSED");
  }
})();
