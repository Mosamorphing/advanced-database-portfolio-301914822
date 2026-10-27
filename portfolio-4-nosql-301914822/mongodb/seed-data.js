(() => {
  const portfolioDb = db.getSiblingDB("nubian_portfolio4");

  const assertCondition = (condition, message) => {
    if (!condition) {
      throw new Error(message);
    }
  };

  for (const collectionName of ["papers", "comments"]) {
    const info = portfolioDb.getCollectionInfos({ name: collectionName })[0];
    assertCondition(
      info?.options?.validator?.$jsonSchema,
      `${collectionName} collection with $jsonSchema validation is required; run setup.js first`
    );
  }

  const ids = {
    papers: {
      metadata: ObjectId("660000000000000000000001"),
      queryPlanning: ObjectId("660000000000000000000002"),
      epidemiology: ObjectId("660000000000000000000003"),
      climate: ObjectId("660000000000000000000004"),
      pendingRepository: ObjectId("660000000000000000000005"),
      rejectedEpidemiology: ObjectId("660000000000000000000006")
    },
    users: {
      ada: ObjectId("660000000000000000000101"),
      readerOne: ObjectId("660000000000000000000102"),
      chidi: ObjectId("660000000000000000000103"),
      dara: ObjectId("660000000000000000000104"),
      readerTwo: ObjectId("660000000000000000000105")
    },
    authors: {
      ada: ObjectId("660000000000000000000201"),
      bola: ObjectId("660000000000000000000202"),
      chidi: ObjectId("660000000000000000000203"),
      dara: ObjectId("660000000000000000000204")
    },
    institutions: {
      research: ObjectId("660000000000000000000301"),
      health: ObjectId("660000000000000000000302"),
      climate: ObjectId("660000000000000000000303")
    },
    fields: {
      computing: ObjectId("660000000000000000000401"),
      publicHealth: ObjectId("660000000000000000000402"),
      environment: ObjectId("660000000000000000000403")
    },
    categories: {
      databases: ObjectId("660000000000000000000501"),
      epidemiology: ObjectId("660000000000000000000502"),
      climate: ObjectId("660000000000000000000503")
    },
    keywords: {
      openAccess: ObjectId("660000000000000000000601"),
      documentDatabases: ObjectId("660000000000000000000602"),
      queryOptimisation: ObjectId("660000000000000000000603"),
      healthData: ObjectId("660000000000000000000604"),
      openData: ObjectId("660000000000000000000605"),
      climateData: ObjectId("660000000000000000000606")
    },
    comments: {
      paperOneThreadOne: ObjectId("660000000000000000000701"),
      paperOneReplyOne: ObjectId("660000000000000000000702"),
      paperOneReplyTwo: ObjectId("660000000000000000000703"),
      paperOneThreadTwo: ObjectId("660000000000000000000704"),
      paperOneReplyThree: ObjectId("660000000000000000000705"),
      paperTwoThread: ObjectId("660000000000000000000706"),
      paperThreeThread: ObjectId("660000000000000000000707")
    }
  };

  const classifications = {
    databases: {
      field: { fieldId: ids.fields.computing, name: "Computing" },
      category: {
        categoryId: ids.categories.databases,
        name: "Database Systems"
      }
    },
    epidemiology: {
      field: { fieldId: ids.fields.publicHealth, name: "Public Health" },
      category: {
        categoryId: ids.categories.epidemiology,
        name: "Epidemiology"
      }
    },
    climate: {
      field: {
        fieldId: ids.fields.environment,
        name: "Environmental Science"
      },
      category: {
        categoryId: ids.categories.climate,
        name: "Climate Studies"
      }
    }
  };

  const authorCatalog = {
    ada: {
      authorId: ids.authors.ada,
      userId: ids.users.ada,
      fullName: "Ada Example",
      orcid: "0000-0000-0000-0000",
      institution: {
        institutionId: ids.institutions.research,
        name: "Synthetic Research Institute"
      }
    },
    bola: {
      authorId: ids.authors.bola,
      userId: null,
      fullName: "Bola Example",
      orcid: null,
      institution: null
    },
    chidi: {
      authorId: ids.authors.chidi,
      userId: ids.users.chidi,
      fullName: "Chidi Example",
      orcid: null,
      institution: {
        institutionId: ids.institutions.health,
        name: "Synthetic Public Health Institute"
      }
    },
    dara: {
      authorId: ids.authors.dara,
      userId: ids.users.dara,
      fullName: "Dara Example",
      orcid: null,
      institution: {
        institutionId: ids.institutions.climate,
        name: "Synthetic Climate Institute"
      }
    }
  };

  const credit = (author, isCorrespondingAuthor) => ({
    ...author,
    isCorrespondingAuthor
  });

  const keywords = {
    openAccess: {
      keywordId: ids.keywords.openAccess,
      name: "Open Access"
    },
    documentDatabases: {
      keywordId: ids.keywords.documentDatabases,
      name: "Document Databases"
    },
    queryOptimisation: {
      keywordId: ids.keywords.queryOptimisation,
      name: "Query Optimisation"
    },
    healthData: {
      keywordId: ids.keywords.healthData,
      name: "Health Data"
    },
    openData: {
      keywordId: ids.keywords.openData,
      name: "Open Data"
    },
    climateData: {
      keywordId: ids.keywords.climateData,
      name: "Climate Data"
    }
  };

  const papers = [
    {
      _id: ids.papers.metadata,
      documentReference: "portfolio4/papers/synthetic-paper-001.pdf",
      submittedByUserId: ids.users.ada,
      title: "A Synthetic Study of Open Research Metadata",
      abstract: "Fictional content created only for the Portfolio 4 document-model demonstration.",
      status: "published",
      classification: classifications.databases,
      authors: [
        credit(authorCatalog.ada, true),
        credit(authorCatalog.bola, false)
      ],
      keywords: [keywords.openAccess, keywords.documentDatabases],
      submittedAt: ISODate("2026-01-15T10:00:00Z"),
      updatedAt: ISODate("2026-01-16T09:30:00Z")
    },
    {
      _id: ids.papers.queryPlanning,
      documentReference: "portfolio4/papers/synthetic-paper-002.pdf",
      submittedByUserId: ids.users.ada,
      title: "Synthetic Query Planning for Research Discovery",
      abstract: "A fictional study used to demonstrate category and keyword retrieval.",
      status: "published",
      classification: classifications.databases,
      authors: [credit(authorCatalog.ada, true)],
      keywords: [keywords.openAccess, keywords.queryOptimisation],
      submittedAt: ISODate("2026-01-18T10:00:00Z"),
      updatedAt: ISODate("2026-01-18T10:00:00Z")
    },
    {
      _id: ids.papers.epidemiology,
      documentReference: "portfolio4/papers/synthetic-paper-003.pdf",
      submittedByUserId: ids.users.chidi,
      title: "A Fictional Open Epidemiology Dataset",
      abstract: "Synthetic public-health research used only for the NoSQL assessment dataset.",
      status: "published",
      classification: classifications.epidemiology,
      authors: [credit(authorCatalog.chidi, true)],
      keywords: [keywords.openAccess, keywords.healthData],
      submittedAt: ISODate("2026-01-20T10:00:00Z"),
      updatedAt: ISODate("2026-01-20T10:00:00Z")
    },
    {
      _id: ids.papers.climate,
      documentReference: "portfolio4/papers/synthetic-paper-004.pdf",
      submittedByUserId: ids.users.dara,
      title: "Synthetic Climate Data for Local Planning",
      abstract: "A fictional environmental study used to create a third aggregation group.",
      status: "published",
      classification: classifications.climate,
      authors: [credit(authorCatalog.dara, true)],
      keywords: [keywords.openData, keywords.climateData],
      submittedAt: ISODate("2026-01-22T10:00:00Z"),
      updatedAt: ISODate("2026-01-22T10:00:00Z")
    },
    {
      _id: ids.papers.pendingRepository,
      documentReference: "portfolio4/papers/synthetic-paper-005.pdf",
      submittedByUserId: ids.users.ada,
      title: "Pending Study of Document-Based Repositories",
      abstract: "A fictional pending paper used as a query-filtering control.",
      status: "pending",
      classification: classifications.databases,
      authors: [credit(authorCatalog.ada, true)],
      keywords: [keywords.openAccess, keywords.documentDatabases],
      submittedAt: ISODate("2026-01-24T10:00:00Z"),
      updatedAt: ISODate("2026-01-24T10:00:00Z")
    },
    {
      _id: ids.papers.rejectedEpidemiology,
      documentReference: "portfolio4/papers/synthetic-paper-006.pdf",
      submittedByUserId: ids.users.chidi,
      title: "Rejected Fictional Epidemiology Report",
      abstract: "A fictional rejected paper used as a query-filtering control.",
      status: "rejected",
      classification: classifications.epidemiology,
      authors: [credit(authorCatalog.chidi, true)],
      keywords: [keywords.openAccess, keywords.healthData],
      submittedAt: ISODate("2026-01-26T10:00:00Z"),
      updatedAt: ISODate("2026-01-26T10:00:00Z")
    }
  ];

  const comments = [
    {
      _id: ids.comments.paperOneThreadOne,
      paperId: ids.papers.metadata,
      author: {
        userId: ids.users.readerOne,
        displayName: "Synthetic Reader"
      },
      parentCommentId: null,
      body: "A fictional top-level comment for the document-model demonstration.",
      createdAt: ISODate("2026-01-17T10:00:00Z"),
      updatedAt: ISODate("2026-01-17T10:00:00Z")
    },
    {
      _id: ids.comments.paperOneReplyOne,
      paperId: ids.papers.metadata,
      author: {
        userId: ids.users.ada,
        displayName: "Ada Example"
      },
      parentCommentId: ids.comments.paperOneThreadOne,
      body: "A fictional reply linked to the first comment.",
      createdAt: ISODate("2026-01-17T11:00:00Z"),
      updatedAt: ISODate("2026-01-17T11:00:00Z")
    },
    {
      _id: ids.comments.paperOneReplyTwo,
      paperId: ids.papers.metadata,
      author: {
        userId: ids.users.chidi,
        displayName: "Chidi Example"
      },
      parentCommentId: ids.comments.paperOneThreadOne,
      body: "A second fictional reply in the same discussion thread.",
      createdAt: ISODate("2026-01-17T12:00:00Z"),
      updatedAt: ISODate("2026-01-17T12:00:00Z")
    },
    {
      _id: ids.comments.paperOneThreadTwo,
      paperId: ids.papers.metadata,
      author: {
        userId: ids.users.readerTwo,
        displayName: "Synthetic Reader Two"
      },
      parentCommentId: null,
      body: "A second fictional top-level comment.",
      createdAt: ISODate("2026-01-18T09:00:00Z"),
      updatedAt: ISODate("2026-01-18T09:00:00Z")
    },
    {
      _id: ids.comments.paperOneReplyThree,
      paperId: ids.papers.metadata,
      author: {
        userId: ids.users.ada,
        displayName: "Ada Example"
      },
      parentCommentId: ids.comments.paperOneThreadTwo,
      body: "A fictional reply in the second discussion thread.",
      createdAt: ISODate("2026-01-18T10:00:00Z"),
      updatedAt: ISODate("2026-01-18T10:00:00Z")
    },
    {
      _id: ids.comments.paperTwoThread,
      paperId: ids.papers.queryPlanning,
      author: {
        userId: ids.users.readerOne,
        displayName: "Synthetic Reader"
      },
      parentCommentId: null,
      body: "A fictional comment on the second paper.",
      createdAt: ISODate("2026-01-19T10:00:00Z"),
      updatedAt: ISODate("2026-01-19T10:00:00Z")
    },
    {
      _id: ids.comments.paperThreeThread,
      paperId: ids.papers.epidemiology,
      author: {
        userId: ids.users.readerTwo,
        displayName: "Synthetic Reader Two"
      },
      parentCommentId: null,
      body: "A fictional comment on the public-health paper.",
      createdAt: ISODate("2026-01-21T10:00:00Z"),
      updatedAt: ISODate("2026-01-21T10:00:00Z")
    }
  ];

  print("Portfolio 4 deterministic synthetic seed");
  print("Resetting only papers and comments in the dedicated assessment database.");

  portfolioDb.comments.deleteMany({});
  portfolioDb.papers.deleteMany({});

  const paperInsert = portfolioDb.papers.insertMany(papers);
  const commentInsert = portfolioDb.comments.insertMany(comments);

  assertCondition(
    paperInsert.acknowledged &&
      Object.keys(paperInsert.insertedIds).length === papers.length,
    "not all paper documents were inserted"
  );
  assertCondition(
    commentInsert.acknowledged &&
      Object.keys(commentInsert.insertedIds).length === comments.length,
    "not all comment documents were inserted"
  );

  const statusCounts = portfolioDb.papers
    .aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, status: "$_id", count: 1 } }
    ])
    .toArray();

  const publishedByField = portfolioDb.papers
    .aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$classification.field.fieldId",
          field: { $first: "$classification.field.name" },
          count: { $sum: 1 }
        }
      },
      { $sort: { field: 1 } },
      { $project: { _id: 0, field: 1, count: 1 } }
    ])
    .toArray();

  print("Portfolio 4 seed result");
  printjson({
    papers: portfolioDb.papers.countDocuments({}),
    comments: portfolioDb.comments.countDocuments({}),
    statusCounts,
    publishedByField
  });
})();
