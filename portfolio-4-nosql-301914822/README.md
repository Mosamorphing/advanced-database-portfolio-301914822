# Portfolio 4: NoSQL and Advanced Data Models

## Purpose

This activity continues the Nubian Research case study by designing and implementing a document-oriented NoSQL model for research-paper discovery. It examines how data that was normalised across several relational tables in Portfolio 1 can be organised around the access patterns of a document database.

The work is an independent academic model built with synthetic data. It does not reproduce Nubian Research's production database, private source code, internal search or ranking logic, moderation procedures, infrastructure, records, or usage figures.

## Portfolio requirement

Portfolio 4 requires a NoSQL model based on the same case study, an example using a document, key-value, column or graph model, implementation evidence, and an explanation of suitability.

The four NoSQL families are alternatives rather than four compulsory implementations. This portfolio uses one document-database example and explains both its advantages and limitations.

## Selected model

MongoDB will be used to implement a paper-centred document model.

Each paper document will contain the bounded information commonly retrieved with a paper:

- Title, abstract, publication status and submission date.
- Embedded field and category details.
- An ordered array of author summaries, including institutional affiliation.
- An array of keywords.

Comments will be stored as separate documents linked to a paper rather than embedded inside it. A paper can receive an unpredictable number of comments, so embedding the complete discussion would allow the paper document to grow without a clear bound.

This is a deliberate assessment design, not a representation of Nubian Research's current or planned production architecture.

## Access patterns

The implementation will demonstrate operations that suit the selected model:

1. Retrieve a published paper with its authors, classification and keywords in one document read.
2. Find published papers by category or keyword.
3. Update a paper document while retaining its validation rules.
4. Retrieve comments belonging to a selected paper.
5. Aggregate publication counts by research field.

These operations are assessment scenarios derived from the Portfolio 1 entities. They are not copies of production queries or business rules.

## Implementation plan

The practical work will provide:

- A documented paper and comment model with representative JSON documents.
- MongoDB collection validation using `$jsonSchema`.
- Deterministic synthetic seed data.
- Indexes justified by the demonstrated access patterns.
- Executable document queries, an update and an aggregation.
- Captured terminal output and selected screenshots.
- An explanation of embedding, referencing, denormalisation, suitability and limitations.

## Suitability questions

The analysis will address:

- Why author summaries, classification and keywords are embedded in a paper document.
- Why comments are referenced separately.
- How the model reduces joins for paper-discovery reads.
- What duplication and update-consistency trade-offs result from denormalisation.
- When the relational model from Portfolio 1 remains the stronger choice.

## Data declaration

All records used in this activity will be generated locally from fixed fictional values. No production or externally sourced dataset will be used. Synthetic email addresses, where required, will use the reserved `example.test` domain.

The dataset will be sized to demonstrate the model and queries reproducibly; it will not be presented as evidence of Nubian Research's production volume, workload or performance.

## Planned evidence

The completed portfolio will contain:

- `document-model.md` for the model, example documents and design decisions.
- MongoDB setup, validation, seed and query scripts.
- Query and aggregation output captured from an actual execution.
- Screenshot evidence of the implementation.
- A final suitability and limitations analysis.
