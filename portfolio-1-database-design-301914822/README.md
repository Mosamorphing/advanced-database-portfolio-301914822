
# Portfolio 1: Database Design and Modelling

## Chosen Case Study Description

### Organisation and system

Nubian Research is an open-access research infrastructure that welcomes scholarly contributions across disciplines. It provides a platform through which researchers can submit and share academic papers, while readers can discover research relevant to their interests. The platform responds to the limited visibility and accessibility of contextual research, particularly research produced within the Global South.

For this portfolio, Nubian Research is treated as a research publication and discovery system. The case study focuses on the database required to organise researchers, institutions, academic papers, research classifications, keywords, moderation information, and discussions around published work.

### Users of the database

The principal users represented in the case study are:

- **Researchers and authors**, who create profiles and submit academic papers.
- **Readers and registered community members**, who discover published papers and participate in discussions.
- **Administrators and reviewers**, who assess submitted papers and manage their publication status.

Institutions are represented as researcher affiliations in the selected scope; they are not treated as system users with institutional accounts.

### Major data to be stored

The database stores information about:

- Authors and their institutional affiliations.
- Institutions represented on the platform.
- Research fields and their categories.
- Academic papers and their descriptive metadata.
- Keywords associated with papers.
- Paper submission and moderation status.
- Comments and replies attached to published papers.

The research documents themselves may be held by an external document-storage service. The relational database stores the metadata and references required to manage and retrieve them.

### Key database operations

The database supports operations such as:

- Registering user accounts and, where applicable, associating author profiles with institutions.
- Submitting and managing academic-paper records.
- Classifying papers by research field, category, and keyword.
- Reviewing submissions and recording their publication status.
- Searching and filtering published papers.
- Retrieving an author's papers and public research profile.
- Adding, retrieving, updating, and removing comments and replies.

### Scope of Portfolio 1

The database model developed in this activity covers the core research-publication domain: users, institutions, research fields, categories, papers, keywords, moderation, and comments. Authentication infrastructure, donations, project-showcase submissions, email delivery, and frontend implementation are outside the scope of this activity.

Nubian Research has been in operation since December 2024. The database models, analysis, implementation evidence, and explanations presented in this portfolio are produced specifically for this individual assessment.

## ER Diagram

The proposed entity-relationship model is documented in the [ER diagram](./er-diagram.md).
