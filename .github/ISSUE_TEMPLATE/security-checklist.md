---
name: Security Quick Checklist
about: Run this checklist for a quick security assessment and attach `.reports/` outputs.
title: "Security Quick Checklist: [SHORT DESC]"
labels: security, triage
assignees: ''
---

### Security Quick Checklist

Please run the checks below and paste `.reports/` outputs or relevant notes.

- [ ] Dependency scan: `npm audit` / `pip-audit` — attach `.reports/*_audit.json` and list High/Critical
- [ ] SAST: `semgrep` / `ESLint` — attach `.reports/semgrep_report.txt` / `.reports/eslint.txt`
- [ ] Hardcoded secrets: search repo for `API_KEY`, `PRIVATE_KEY`, `AWS_SECRET`, etc.
- [ ] Auth / Authorization checks (IDOR, role checks) — describe test steps and results
- [ ] Token / Session handling (expired, replay) — describe test steps and results
- [ ] Input validation (basic XSS / SQLi test payloads) — describe endpoints and results
- [ ] Logging & PII: confirm logs do not contain credit card numbers, passwords, SSNs
- [ ] Configuration: TLS enforced, secure cookies, CORS policy, secure headers
- [ ] Rate limiting / brute-force protection checks (login endpoints)

#### Notes / Findings

Provide short summary of findings and link to issues created for High/Critical items.
