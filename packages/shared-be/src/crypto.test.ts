import { describe, expect, it } from 'bun:test';
import { CryptoError, decrypt, encrypt } from './crypto';

const TEST_KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);

describe('encrypt', () => {
    it('returns a non-empty base64 string', async () => {
        const result = await encrypt('hello', TEST_KEY);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('produces different ciphertexts for same plaintext (IV randomness)', async () => {
        const a = await encrypt('hello', TEST_KEY);
        const b = await encrypt('hello', TEST_KEY);
        expect(a).not.toBe(b);
    });

    it('throws CryptoError for invalid key length', async () => {
        await expect(encrypt('hello', 'short')).rejects.toBeInstanceOf(CryptoError);
    });

    it('throws CryptoError for non-hex key', async () => {
        await expect(encrypt('hello', 'zz'.repeat(32))).rejects.toBeInstanceOf(CryptoError);
    });
});

describe('decrypt', () => {
    it('round-trips plaintext correctly', async () => {
        const original = 'my-secret-token-123';
        const ciphertext = await encrypt(original, TEST_KEY);
        const decrypted = await decrypt(ciphertext, TEST_KEY);
        expect(decrypted).toBe(original);
    });

    it('round-trips empty string', async () => {
        const ciphertext = await encrypt('', TEST_KEY);
        const decrypted = await decrypt(ciphertext, TEST_KEY);
        expect(decrypted).toBe('');
    });

    it('round-trips unicode text', async () => {
        const original = 'Hello 👋 世界 🌍';
        const ciphertext = await encrypt(original, TEST_KEY);
        const decrypted = await decrypt(ciphertext, TEST_KEY);
        expect(decrypted).toBe(original);
    });

    it('throws CryptoError with wrong key', async () => {
        const ciphertext = await encrypt('hello', TEST_KEY);
        await expect(decrypt(ciphertext, OTHER_KEY)).rejects.toBeInstanceOf(CryptoError);
    });

    it('throws CryptoError on tampered ciphertext', async () => {
        const ciphertext = await encrypt('hello', TEST_KEY);
        const tampered = `${ciphertext.slice(0, -4)}XXXX`;
        await expect(decrypt(tampered, TEST_KEY)).rejects.toBeInstanceOf(CryptoError);
    });

    it('throws CryptoError for invalid base64', async () => {
        await expect(decrypt('not-valid-base64!!!', TEST_KEY)).rejects.toBeInstanceOf(CryptoError);
    });

    it('throws CryptoError for ciphertext too short', async () => {
        await expect(decrypt('aaaa', TEST_KEY)).rejects.toBeInstanceOf(CryptoError);
    });
});
