# Tool Strategy Reflection

## Feature Usage Log

| # | Case-study use | Feature | Why this feature | Outcome |
|---|---|---|---|---|
| 1 | Baseline project generation | Chat Ask | Required exact prompt and preserves a reviewable AI baseline. | Produced intentionally weak contractor code. |
| 2 | Security review | Ask + `#file` | Analysis without accidental edits and precise file context. | Surfaced missing persistence and auth concerns. |
| 3 | Architecture context | `@workspace` | Understands local instructions and neighboring layers. | Helped shape repository/service boundaries. |
| 4 | Multi-file scaffolding | Agent Mode | Efficient for coordinated model, repository, service, and controller files. | Required human diff review and corrections. |
| 5 | Suspicious logic | `/explain` | Explains a selected block without changing it. | Confirmed why hard-coded recipients violated the contract. |
| 6 | Focused test creation | `/tests` and inline suggestions | Targets an existing slice and keeps test intent visible. | Generated cases that were tightened for tenant behavior. |

## Scenario Responses

1. **600-line legacy service:** Use Ask Mode with `@workspace` and `#file`, then `/explain` selected methods. This preserves read-only analysis while connecting the file to local conventions and call sites.
2. **Validation across ten handlers:** Use Edit Mode with `@workspace` and a representative handler as a few-shot example. The diff preview makes repeated changes reviewable and keeps schemas consistent.
3. **JWT expiry and tampering:** Use Ask Mode with `/explain` on verification code, then `/tests` for expired, malformed, and signature-tampered tokens. This separates understanding from test generation.
4. **Commit gates:** Use repository configuration and CI workflows, not Copilot alone. Copilot can draft the workflow, but GitHub Actions must enforce lint, tests, and coverage independently.
5. **Contractor security review:** Use Ask Mode as a security reviewer with `#file`, `/explain`, and explicit tenant/authorization constraints. Read-only analysis reduces accidental trust in an autonomous rewrite.
6. **Consistent tenant rules:** Put invariants in `.github/copilot-instructions.md`, reinforce them in review prompts, and enforce them with tests and CI. Instructions improve consistency but cannot replace authorization middleware or database constraints.

## Limitations Encountered

1. **Hard-coded team members:** A generated notification service returned sample user IDs instead of querying membership. I detected this by comparing the code to the dispatch requirement and replaced it with a repository-backed provider.
2. **Missing tenant semantics:** The baseline `getByTeam` filtered only by team ID. A type checker cannot infer tenant policy, so manual review caught the possible cross-organization disclosure and the remediated repository requires both IDs.
3. **Unverifiable process evidence:** A documentation-only workflow cannot honestly create screenshots of Copilot mode indicators or license details. I treated those as associate-captured evidence requirements rather than fabricating screenshots; the final Word document must be assembled in a real IDE session.
