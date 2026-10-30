# Orbit Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Verified Identity Gate**: Every write operation requires an authenticated user with `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Split-Collection Isolation**: User email addresses are stored exclusively in `/users/{userId}/private/{docId}` where `docId == 'info'` and are readable/writable strictly by `request.auth.uid == userId`. Non-PII display data is stored in `/users/{userId}/public/{docId}`.
4. **Master Gate Relational Ownership**:
   - An `/agents/{agentId}` document can only be created, read, updated, or deleted by `ownerId == request.auth.uid`.
   - Subcollections `/agents/{agentId}/routines/{routineId}`, `/agents/{agentId}/executions/{executionId}`, and `/agents/{agentId}/messages/{messageId}` require `get(/databases/$(database)/documents/agents/$(agentId)).data.ownerId == request.auth.uid` on single-document operations and `resource.data.ownerId == request.auth.uid` on list queries.
5. **Immutable Ownership & Creation Timestamps**: `ownerId`, `agentId`, and `createdAt` can never be mutated during an `update`. On `create`, `createdAt == request.time`. On `update`, `updatedAt == request.time`.
6. **Terminal State Locking**: Once a `RoutineExecution` reaches `status == 'completed'` or `status == 'failed'`, no further updates are permitted.

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting to create an agent in `/agents/agent_1`.
2. **Shadow Field Injection on Create**: Creating `/agents/agent_1` with an undeclared field `isAdmin: true`.
3. **Cross-Tenant Agent Spoofing**: User `uid_attacker` creating `/agents/agent_1` with `ownerId: "uid_victim"`.
4. **ID Poisoning Attack**: Creating `/agents/invalid$id!@#` with non-alphanumeric characters or > 128 chars.
5. **Denial-of-Wallet String Overflow**: Creating `/agents/agent_1` with a `description` of 10,000 characters (exceeds 4,000 limit).
6. **Unbounded Array Poisoning**: Updating `/agents/agent_1` with `tools` containing 25 items (exceeds 10 item cap) or non-string first element `[123]`.
7. **Owner Mutation on Update**: Updating `/agents/agent_1` to change `ownerId` from `uid_owner` to `uid_attacker`.
8. **CreatedAt Tampering on Update**: Updating `/agents/agent_1` while modifying `createdAt` or providing a forged `updatedAt != request.time`.
9. **Orphaned Subcollection Creation**: Creating `/agents/non_existent_agent/routines/routine_1` when parent `/agents/non_existent_agent` does not exist or belongs to another user.
10. **PII Cross-User Read**: User `uid_attacker` attempting `get` on `/users/uid_victim/private/info`.
11. **Blanket List Query Scraping**: User `uid_attacker` running an unconstrained `list` on `/agents` without `where('ownerId', '==', request.auth.uid)`.
12. **Terminal Execution Mutation**: Attempting to `update` `/agents/agent_1/executions/exec_1` after `resource.data.status == 'completed'`.
