import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');

test('Dirty Dozen #1-12: Firestore rules structural & invariant verification', () => {
  // 1. Global Safety Net
  assert.match(rulesContent, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);

  // 2. Verified email requirement on writes
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);

  // 3. Strict ID poisoning guard regex
  assert.match(rulesContent, /\^\[a-zA-Z0-9_\\\\-\]\+\$/);

  // 4. Shadow field prevention via hasAll + hasOnly on all entities
  assert.match(rulesContent, /isValidAgentConfig\(data, agentId\)/);
  assert.match(rulesContent, /isValidAgentRoutine\(data, agentId, routineId\)/);
  assert.match(rulesContent, /isValidRoutineExecution\(data, agentId, executionId\)/);
  assert.match(rulesContent, /isValidAgentChatMessage\(data, agentId, messageId\)/);
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(/);

  // 5. PII isolation in split collection (/users/{userId}/private/{docId})
  assert.match(rulesContent, /match \/users\/\{userId\}\/private\/\{docId\}/);
  assert.match(rulesContent, /allow list: if false;/);

  // 6. Master gate parent check on subcollections
  assert.match(rulesContent, /isAgentOwner\(agentId\)/);

  // 7. Terminal state locking on RoutineExecution
  assert.match(rulesContent, /!\(existing\(\)\.status in \['completed', 'failed'\]\)/);

  // 8. Query Enforcer on allow list (no blanket reads)
  assert.match(rulesContent, /allow list: if isSignedIn\(\) && existing\(\)\.ownerId == request\.auth\.uid;/);
});
