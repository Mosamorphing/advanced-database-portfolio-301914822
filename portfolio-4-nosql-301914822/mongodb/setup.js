(() => {
  const portfolioDb = db.getSiblingDB("nubian_portfolio4");

  // This reset is intentionally limited to the two collections managed by
  // Portfolio 4 in its dedicated assessment database.
  for (const collectionName of ["comments", "papers"]) {
    if (portfolioDb.getCollectionInfos({ name: collectionName }).length > 0) {
      portfolioDb.getCollection(collectionName).drop();
    }
  }

  const papersSchema = {
    bsonType: "object",
    title: "Portfolio 4 paper document",
    required: [
      "_id",
      "documentReference",
      "submittedByUserId",
      "title",
      "abstract",
      "status",
      "classification",
      "authors",
      "keywords",
      "submittedAt",
      "updatedAt"
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      documentReference: {
        bsonType: "string",
        minLength: 1,
        maxLength: 255,
        pattern: "\\S"
      },
      submittedByUserId: { bsonType: "objectId" },
      title: {
        bsonType: "string",
        minLength: 1,
        maxLength: 255,
        pattern: "\\S"
      },
      abstract: {
        bsonType: "string",
        minLength: 1,
        pattern: "\\S"
      },
      status: {
        bsonType: "string",
        enum: ["pending", "published", "rejected"]
      },
      classification: {
        bsonType: "object",
        required: ["field", "category"],
        additionalProperties: false,
        properties: {
          field: {
            bsonType: "object",
            required: ["fieldId", "name"],
            additionalProperties: false,
            properties: {
              fieldId: { bsonType: "objectId" },
              name: {
                bsonType: "string",
                minLength: 1,
                maxLength: 150,
                pattern: "\\S"
              }
            }
          },
          category: {
            bsonType: "object",
            required: ["categoryId", "name"],
            additionalProperties: false,
            properties: {
              categoryId: { bsonType: "objectId" },
              name: {
                bsonType: "string",
                minLength: 1,
                maxLength: 150,
                pattern: "\\S"
              }
            }
          }
        }
      },
      authors: {
        bsonType: "array",
        minItems: 1,
        items: {
          bsonType: "object",
          required: [
            "authorId",
            "userId",
            "fullName",
            "orcid",
            "institution",
            "isCorrespondingAuthor"
          ],
          additionalProperties: false,
          properties: {
            authorId: { bsonType: "objectId" },
            userId: { bsonType: ["objectId", "null"] },
            fullName: {
              bsonType: "string",
              minLength: 1,
              maxLength: 200,
              pattern: "\\S"
            },
            orcid: {
              oneOf: [
                { bsonType: "null" },
                {
                  bsonType: "string",
                  maxLength: 19,
                  pattern: "^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$"
                }
              ]
            },
            institution: {
              oneOf: [
                { bsonType: "null" },
                {
                  bsonType: "object",
                  required: ["institutionId", "name"],
                  additionalProperties: false,
                  properties: {
                    institutionId: { bsonType: "objectId" },
                    name: {
                      bsonType: "string",
                      minLength: 1,
                      maxLength: 255,
                      pattern: "\\S"
                    }
                  }
                }
              ]
            },
            isCorrespondingAuthor: { bsonType: "bool" }
          }
        }
      },
      keywords: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["keywordId", "name"],
          additionalProperties: false,
          properties: {
            keywordId: { bsonType: "objectId" },
            name: {
              bsonType: "string",
              minLength: 1,
              maxLength: 100,
              pattern: "\\S"
            }
          }
        }
      },
      submittedAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" }
    }
  };

  const commentsSchema = {
    bsonType: "object",
    title: "Portfolio 4 comment document",
    required: [
      "_id",
      "paperId",
      "author",
      "parentCommentId",
      "body",
      "createdAt",
      "updatedAt"
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      paperId: { bsonType: "objectId" },
      author: {
        bsonType: "object",
        required: ["userId", "displayName"],
        additionalProperties: false,
        properties: {
          userId: { bsonType: "objectId" },
          displayName: {
            bsonType: "string",
            minLength: 1,
            maxLength: 150,
            pattern: "\\S"
          }
        }
      },
      parentCommentId: { bsonType: ["objectId", "null"] },
      body: {
        bsonType: "string",
        minLength: 1,
        pattern: "\\S"
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" }
    }
  };

  portfolioDb.createCollection("papers", {
    validator: { $jsonSchema: papersSchema },
    validationLevel: "strict",
    validationAction: "error"
  });

  portfolioDb.createCollection("comments", {
    validator: { $jsonSchema: commentsSchema },
    validationLevel: "strict",
    validationAction: "error"
  });

  const paperIndexes = [
    portfolioDb.papers.createIndex(
      { documentReference: 1 },
      {
        name: "uq_papers_document_reference",
        unique: true
      }
    ),
    portfolioDb.papers.createIndex(
      {
        status: 1,
        "classification.category.categoryId": 1,
        submittedAt: -1
      },
      { name: "papers_status_category_submitted_at" }
    ),
    portfolioDb.papers.createIndex(
      { "keywords.keywordId": 1, status: 1 },
      { name: "papers_keyword_status" }
    )
  ];

  const commentIndexes = [
    portfolioDb.comments.createIndex(
      { paperId: 1, createdAt: 1 },
      { name: "comments_paper_created_at" }
    ),
    portfolioDb.comments.createIndex(
      { paperId: 1, parentCommentId: 1, createdAt: 1 },
      { name: "comments_paper_parent_created_at" }
    )
  ];

  print("Portfolio 4 MongoDB collections and validators created.");
  printjson({
    database: portfolioDb.getName(),
    collections: portfolioDb.getCollectionNames().sort(),
    customIndexes: paperIndexes.concat(commentIndexes)
  });
})();
