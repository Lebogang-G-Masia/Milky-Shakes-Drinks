# Risk Register

> Team scoring convention: Probability 1-5 x Impact 1-5 = Risk Score. Priority bands: 1-4 Low, 5-9 Medium, 10-14 High, 15-25 Critical.

| ID | Risk | Cause | Probability | Impact | Priority | Mitigation | Contingency | Status |
| -- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Requirements may be ambiguous or interpreted differently, causing rework or incorrect downstream decisions. | The brief contains broad capabilities and some business rules remain open. | 3 - Possible | 4 - Major | 12 High | Use stable IDs, explicit sources, priorities and measurable acceptance criteria; team-review requirements and maintain the RTM. | Clarify the source; revise the requirement/AC through controlled change; update RTM and dependent artefacts. | Open |
| R-002 | Security/privacy requirements may be identified too late, causing redesign or inappropriate information handling. | Roles, permissions, data classification and detailed security rules are not fully defined. | 3 - Possible | 5 - Severe | 15 Critical | Capture security/privacy requirements early; identify role/access expectations and sensitive data; review security impact in requirements and PRs. | Raise controlled change; revise affected requirements/data-access expectations, update traceability/risks and reconsider later architecture decisions. | Open |
| R-003 | Important requirements may later be difficult or expensive to verify. | Acceptance criteria or NFRs may use vague/subjective wording. | 3 - Possible | 4 - Major | 12 High | Use testable FRs and measurable NFRs with acceptance criteria; review wording for ambiguity/testability. | Refine before baseline or process through controlled change after baseline; update RTM and later verification plans. | Open |
