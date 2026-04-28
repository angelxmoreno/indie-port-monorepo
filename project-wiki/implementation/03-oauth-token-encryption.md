# 03 — OAuth Token Encryption

## Status

✅ DONE

## Goal

Encrypt OAuth access tokens and refresh tokens at rest before storing them in the `social_connections` table, and decrypt them when the queue service needs to use them.

## Context

The tech-stack decision requires at-rest encryption for OAuth tokens (per the P1 finding that storing high-value secrets without storage-layer protection is unacceptable). The `social_connections` table currently stores `access_token` and `refresh_token` as plain `text` columns. We need application-layer AES-256-GCM encryption so that even if the database is compromised, tokens remain unreadable.

## Files to Create

- `packages/shared-be/src/crypto.ts` — `encrypt(plaintext)` and `decrypt(ciphertext)` functions using Node.js `crypto` module with AES-256-GCM. Reads `ENCRYPTION_KEY` from env (32-byte hex key). Returns `{ ciphertext, iv, authTag }` as a JSON string for storage.
- `packages/shared-be/src/crypto.test.ts` — tests for encrypt/decrypt roundtrip, tamper detection, wrong key rejection

## Files to Modify

- `packages/shared-be/src/index.ts` — re-export crypto functions
- `packages/database/src/schema.ts` — update `accessToken` and `refreshToken` column comments/types if needed (they stay `text` but now store encrypted JSON blobs)
- `project-wiki/database/schema.md` — document that `access_token` and `refresh_token` are stored encrypted

## Files to Reference

- `project-wiki/decisions/tech-stack.md` — encryption decision
- `packages/database/src/schema.ts` — social_connections table definition
- `project-wiki/database/schema.md` — schema documentation

## Acceptance Criteria

- `encrypt()` produces a deterministic JSON structure containing ciphertext, IV, and auth tag
- `decrypt()` reverses `encrypt()` for valid ciphertext
- Tampered ciphertext fails decryption with a clear error
- Wrong encryption key fails decryption with a clear error
- `ENCRYPTION_KEY` is read from environment, never hardcoded
- `bun run validate` passes with zero errors

## Commit Message

```
feat(shared-be): added AES-256-GCM encryption for OAuth tokens at rest

- Implemented encrypt/decrypt helpers using AES-256-GCM
- Added comprehensive tests for roundtrip, tamper, and wrong-key cases
- Documented that social_connections tokens are stored encrypted
```