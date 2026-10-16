# Schema Validation

## Environment

- Database: PostgreSQL 17
- Dataset: Synthetic records using the reserved `example.test` domain

## Reproduction

The recommended approach is to use Docker. It provides PostgreSQL 17 without requiring PostgreSQL to be installed directly on the host computer.

### Option A: Run with Docker

Requirements:

- Docker Desktop or Docker Engine is installed and running.
- The commands are executed from the `portfolio-1-database-design-301914822` directory.

Start a temporary PostgreSQL 17 container:

```bash
docker run --rm \
  --name nubian-portfolio1-postgres \
  -e POSTGRES_PASSWORD=portfolio_validation \
  -e POSTGRES_DB=nubian_portfolio_lab \
  -d postgres:17
```

Wait until PostgreSQL reports that it is ready:

```bash
docker exec nubian-portfolio1-postgres \
  pg_isready -U postgres -d nubian_portfolio_lab
```

Copy the SQL files into the container:

```bash
docker cp sql/schema.sql \
  nubian-portfolio1-postgres:/tmp/schema.sql

docker cp sql/validate-schema.sql \
  nubian-portfolio1-postgres:/tmp/validate-schema.sql
```

Create the schema:

```bash
docker exec nubian-portfolio1-postgres \
  psql -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 -f /tmp/schema.sql
```

Run the validation:

```bash
docker exec nubian-portfolio1-postgres \
  psql -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 -f /tmp/validate-schema.sql
```

Stop the temporary database after reviewing the output:

```bash
docker stop nubian-portfolio1-postgres
```

The container was started with `--rm`, so Docker removes it automatically after it stops.

### Option B: Use an existing PostgreSQL 17 installation

Create an empty database and run both scripts against it:

```bash
createdb -U postgres nubian_portfolio_lab

psql -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 -f sql/schema.sql

psql -U postgres -d nubian_portfolio_lab \
  -v ON_ERROR_STOP=1 -f sql/validate-schema.sql
```

`schema.sql` creates the `nubian_portfolio` namespace and its relations. `validate-schema.sql` begins a transaction, inserts a small connected dataset, runs validation queries and rolls the data back. The schema remains available while the synthetic test records are removed.

## Why `example.test` is used

The `.test` top-level domain is reserved for documentation and testing. Addresses such as `ada.researcher@example.test` cannot accidentally target a real organisation's email domain. They are synthetic identifiers only; no email service or website needs to be visited.

## Checks performed

The validation confirms that:

- All 12 relations are created successfully.
- A paper can retain an ordered list containing both a registered author and an external co-author.
- A comment reply can retrieve its parent comment within the same paper.
- The paper-status check rejects a value outside `pending`, `published` and `rejected`.
- A rejected review without a reason is rejected.
- The validation data is removed with `ROLLBACK`.

## Result

The schema and validation scripts executed successfully against PostgreSQL 17. The principal output was:

```text
 relation_count
----------------
             12

 title                        | ordered_authors
------------------------------+--------------------------------
 A Synthetic Research Paper   | Ada Researcher, Bola External

 reply                 | parent_comment
-----------------------+----------------------------------
 A synthetic reply.    | A top-level synthetic comment.

NOTICE: PASS: invalid paper status was rejected
NOTICE: PASS: rejected review without a reason was rejected
ROLLBACK
```
