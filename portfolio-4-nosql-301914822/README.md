# Portfolio 4: NoSQL and Advanced Data Models

## Purpose

This activity continues the Nubian Research case study by designing and implementing a document-oriented NoSQL model for research-paper discovery. It examines how selected data that was normalised across several relational tables in Portfolio 1 can instead be organised around document-database access patterns.

The work is an independent academic model built with synthetic data. It does not reproduce Nubian Research's production database, private source code, internal search or ranking logic, moderation procedures, infrastructure, records, or usage figures.

## Portfolio requirement

Portfolio 4 requires a NoSQL model based on the same case study, an example using a document, key-value, column or graph model, implementation evidence, and an explanation of suitability.

The four NoSQL families are alternatives rather than four compulsory implementations. This portfolio uses MongoDB to implement and evaluate one document-database model.

## Selected model

The implementation uses two MongoDB collections: `papers` and `comments`.

Each paper document contains the bounded information commonly retrieved with a paper:

- Title, abstract, publication status and submission date.
- Embedded field and category details.
- An ordered array of author summaries, including institutional affiliation.
- An array of keywords.

Comments are stored as separate documents linked to a paper. A paper can receive an unpredictable number of comments, so embedding the complete discussion would allow the paper document to grow without a clear bound.

The complete model, representative BSON documents and relational-to-document mapping are documented in [`document-model.md`](./document-model.md). This is an assessment design, not a representation of Nubian Research's current or planned production architecture.

## Demonstrated access patterns

The implementation demonstrates:

1. Retrieving a published paper with its authors, classification and keywords in one document read.
2. Finding published papers by category and by keyword.
3. Rejecting an invalid update through collection validation and completing a valid single-document update.
4. Retrieving a page of comments for a paper and the replies to one comment.
5. Aggregating published-paper counts by research field.

These operations are assessment scenarios derived from the Portfolio 1 entities. They are not copies of production queries or business rules.

## Implementation

The MongoDB implementation contains:

- [`setup.js`](./mongodb/setup.js), which creates the collections, strict `$jsonSchema` validators and five access-pattern-driven indexes.
- [`validate-model.js`](./mongodb/validate-model.js), which tests valid and invalid documents, uniqueness, index usability and fixture cleanup.
- [`seed-data.js`](./mongodb/seed-data.js), which resets and inserts a deterministic dataset of six papers and seven comments.
- [`validate-data.js`](./mongodb/validate-data.js), which checks identifiers, counts, dates, embedded snapshots, comment references and expected query targets.
- [`queries.js`](./mongodb/queries.js), which executes the declared reads, update and aggregation with exact result assertions.

The update demonstration first proves that the validator rejects the unsupported status `archived`. It then updates one pending paper successfully and restores the complete original document in a `finally` block. A subsequent data-validation run confirms that the demonstration leaves the seeded dataset unchanged.

## Data declaration

The permanent demonstration dataset is generated locally from fixed fictional values. The model-validation script uses temporary locally generated identifiers and verifies that its fixtures are removed. No production or externally sourced dataset is used.

The dataset is sized to demonstrate the model and queries reproducibly. It is not evidence of Nubian Research's production volume, workload or performance.

## Results and evidence

- [`model-validation.txt`](./evidence/model-validation.txt) records successful collection validation, uniqueness and index-usability checks.
- [`data-validation.txt`](./evidence/data-validation.txt) records the deterministic seed summary and data-integrity checks.
- [`query-results.txt`](./evidence/query-results.txt) records the document queries, rejected and accepted updates, comment retrieval, aggregation and post-query restoration check.
- [`mongodb-model-validation.png`](./evidence/mongodb-model-validation.png) shows the model-validation checks executing successfully in the terminal.
- [`mongodb-query-data-validation.png`](./evidence/mongodb-query-data-validation.png) shows the query demonstration and post-query data validation executing successfully.

The executed checks produced the following final results:

```text
MODEL VALIDATION PASSED
DATA VALIDATION PASSED
QUERY DEMONSTRATION PASSED
DATA VALIDATION PASSED
```

The second data-validation result was produced after the query demonstration and confirms that the temporary update was fully restored.

## Suitability and limitations

The document model suits the demonstrated paper-discovery reads because a paper's classification, ordered authors and keywords can be returned together without reconstructing them through joins. BSON documents also represent nested classification objects and ordered author arrays naturally.

This benefit introduces duplication. Author, institution, category and keyword names are stored as snapshots in multiple paper documents, so changes to shared reference data may require several updates and may temporarily produce inconsistent copies. MongoDB's document validator also does not enforce the cross-document references between comments, papers and parent comments as relational foreign keys would.

The Portfolio 1 relational model remains the stronger choice for workflows requiring normalised shared data, enforced referential integrity and multi-entity transactions. The MongoDB model is therefore suitable for the selected read-oriented access patterns, not a claim that it should replace the relational database or that MongoDB is inherently more scalable.

Further reasoning about embedding, referencing, consistency boundaries and the 16 MiB document-size limit is provided in [`document-model.md`](./document-model.md).

## Reproduction with Docker

Run the following commands from the repository root. Docker must be installed and running.

### Start MongoDB 8.0

```bash
docker run --rm \
  --name nubian-portfolio4-mongodb \
  -d mongo:8.0

docker exec nubian-portfolio4-mongodb \
  mongosh --quiet --eval "db.runCommand({ ping: 1 })"
```

Continue after the ping result contains `ok: 1`. If MongoDB is still starting, wait briefly and rerun the ping command.

### Copy the scripts

```bash
docker exec nubian-portfolio4-mongodb \
  mkdir -p /tmp/portfolio4

docker cp portfolio-4-nosql-301914822/mongodb/. \
  nubian-portfolio4-mongodb:/tmp/portfolio4/
```

### Create and validate the model

```bash
docker exec nubian-portfolio4-mongodb \
  mongosh --quiet --file /tmp/portfolio4/setup.js

docker exec nubian-portfolio4-mongodb \
  mongosh --quiet --file /tmp/portfolio4/validate-model.js
```

### Seed and validate the dataset

```bash
docker exec nubian-portfolio4-mongodb \
  mongosh --quiet --file /tmp/portfolio4/seed-data.js

docker exec nubian-portfolio4-mongodb \
  mongosh --quiet --file /tmp/portfolio4/validate-data.js
```

### Run the query demonstration

```bash
docker exec nubian-portfolio4-mongodb \
  mongosh --quiet --file /tmp/portfolio4/queries.js

docker exec nubian-portfolio4-mongodb \
  mongosh --quiet --file /tmp/portfolio4/validate-data.js
```

The final command verifies that `queries.js` restored the original deterministic dataset. Stop the temporary database after reviewing the output:

```bash
docker stop nubian-portfolio4-mongodb
```
