BEGIN;

CREATE SCHEMA IF NOT EXISTS nubian_portfolio;
SET search_path TO nubian_portfolio, public;

CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
    email VARCHAR(320) NOT NULL UNIQUE CHECK (btrim(email) <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE institutions (
    institution_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE CHECK (btrim(name) <> '')
);

CREATE TABLE authors (
    author_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT UNIQUE,
    institution_id BIGINT,
    full_name VARCHAR(200) NOT NULL CHECK (btrim(full_name) <> ''),
    orcid VARCHAR(19) UNIQUE,
    CONSTRAINT authors_user_fk
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT authors_institution_fk
        FOREIGN KEY (institution_id) REFERENCES institutions (institution_id) ON DELETE SET NULL,
    CONSTRAINT authors_orcid_format_check CHECK (
        orcid IS NULL
        OR orcid ~ '^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'
    )
);

CREATE TABLE fields (
    field_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE CHECK (btrim(name) <> '')
);

CREATE TABLE categories (
    category_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    field_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
    CONSTRAINT categories_field_name_unique UNIQUE (field_id, name),
    CONSTRAINT categories_field_fk
        FOREIGN KEY (field_id) REFERENCES fields (field_id) ON DELETE RESTRICT
);

CREATE TABLE papers (
    paper_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    submitted_by_user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL CHECK (btrim(title) <> ''),
    abstract TEXT NOT NULL CHECK (btrim(abstract) <> ''),
    document_reference VARCHAR(255) NOT NULL UNIQUE
        CHECK (btrim(document_reference) <> ''),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT papers_submitter_fk
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT papers_category_fk
        FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE RESTRICT,
    CONSTRAINT papers_status_check
        CHECK (status IN ('pending', 'published', 'rejected')),
    CONSTRAINT papers_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE paper_authors (
    paper_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    author_order INTEGER NOT NULL CHECK (author_order > 0),
    is_corresponding_author BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT paper_authors_pk PRIMARY KEY (paper_id, author_id),
    CONSTRAINT paper_authors_order_unique UNIQUE (paper_id, author_order),
    CONSTRAINT paper_authors_paper_fk
        FOREIGN KEY (paper_id) REFERENCES papers (paper_id) ON DELETE CASCADE,
    CONSTRAINT paper_authors_author_fk
        FOREIGN KEY (author_id) REFERENCES authors (author_id) ON DELETE RESTRICT
);

CREATE TABLE keywords (
    keyword_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE CHECK (btrim(name) <> '')
);

CREATE TABLE paper_keywords (
    paper_id BIGINT NOT NULL,
    keyword_id BIGINT NOT NULL,
    CONSTRAINT paper_keywords_pk PRIMARY KEY (paper_id, keyword_id),
    CONSTRAINT paper_keywords_paper_fk
        FOREIGN KEY (paper_id) REFERENCES papers (paper_id) ON DELETE CASCADE,
    CONSTRAINT paper_keywords_keyword_fk
        FOREIGN KEY (keyword_id) REFERENCES keywords (keyword_id) ON DELETE CASCADE
);

CREATE TABLE administrators (
    administrator_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(150) NOT NULL CHECK (btrim(name) <> ''),
    email VARCHAR(320) NOT NULL UNIQUE CHECK (btrim(email) <> '')
);

CREATE TABLE paper_reviews (
    review_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paper_id BIGINT NOT NULL,
    reviewer_id BIGINT NOT NULL,
    decision VARCHAR(20) NOT NULL,
    reason TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT paper_reviews_paper_fk
        FOREIGN KEY (paper_id) REFERENCES papers (paper_id) ON DELETE CASCADE,
    CONSTRAINT paper_reviews_reviewer_fk
        FOREIGN KEY (reviewer_id) REFERENCES administrators (administrator_id) ON DELETE RESTRICT,
    CONSTRAINT paper_reviews_decision_check
        CHECK (decision IN ('approved', 'rejected')),
    CONSTRAINT paper_reviews_rejection_reason_check CHECK (
        decision <> 'rejected'
        OR (reason IS NOT NULL AND btrim(reason) <> '')
    )
);

CREATE TABLE comments (
    comment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paper_id BIGINT NOT NULL,
    author_user_id BIGINT NOT NULL,
    parent_comment_id BIGINT,
    body TEXT NOT NULL CHECK (btrim(body) <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comments_identity_per_paper_unique UNIQUE (comment_id, paper_id),
    CONSTRAINT comments_paper_fk
        FOREIGN KEY (paper_id) REFERENCES papers (paper_id) ON DELETE CASCADE,
    CONSTRAINT comments_author_fk
        FOREIGN KEY (author_user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT comments_parent_fk
        FOREIGN KEY (parent_comment_id, paper_id)
        REFERENCES comments (comment_id, paper_id)
        ON DELETE CASCADE,
    CONSTRAINT comments_not_own_parent_check
        CHECK (parent_comment_id IS NULL OR parent_comment_id <> comment_id),
    CONSTRAINT comments_timestamp_order_check CHECK (updated_at >= created_at)
);

COMMIT;
