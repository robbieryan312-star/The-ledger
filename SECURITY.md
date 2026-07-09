# Security Policy

## Reporting a vulnerability

Email **robbie.ryan312@gmail.com** with:

- Description of the issue and potential impact
- Steps to reproduce (if applicable)
- Whether you believe credentials or user data are at risk

Do **not** open a public GitHub issue for security-sensitive reports.

We aim to acknowledge reports within a few business days. Critical issues affecting
production data integrity or exposed secrets will be prioritized.

## Scope

This repository is a static Next.js civic-data site. Reports are in scope for:

- Exposed API keys or secrets in tracked files
- SSRF or unsafe fetch patterns in sync scripts
- Authentication or authorization flaws in owner-facing tooling

Out of scope: third-party APIs (FEC, Congress.gov, etc.), social engineering, and
denial-of-service against external services.

## Supported versions

Only the current `main` branch and active PR branches receive security fixes.
There is no long-term support for older release tags.
