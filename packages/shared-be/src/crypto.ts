export class CryptoError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CryptoError';
    }
}

function hexToBytes(hex: string): Uint8Array {
    if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
        throw new CryptoError('Invalid hex string');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}

function base64Encode(bytes: Uint8Array): string {
    const CHUNK_SIZE = 65534;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, i + CHUNK_SIZE);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

function base64Decode(str: string): Uint8Array {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function importKey(keyHex: string): Promise<CryptoKey> {
    const keyBytes = hexToBytes(keyHex);
    if (keyBytes.length !== 32) {
        throw new CryptoError(`Invalid key length: expected 32 bytes, got ${keyBytes.length}`);
    }

    try {
        return await crypto.subtle.importKey(
            'raw',
            keyBytes.buffer as ArrayBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    } catch {
        throw new CryptoError('Failed to import encryption key');
    }
}

export async function encrypt(plaintext: string, keyHex: string): Promise<string> {
    const key = await importKey(keyHex);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    let encrypted: ArrayBuffer;
    try {
        encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    } catch {
        throw new CryptoError('Encryption failed');
    }

    const encryptedBytes = new Uint8Array(encrypted);
    const payload = new Uint8Array(iv.length + encryptedBytes.length);
    payload.set(iv, 0);
    payload.set(encryptedBytes, iv.length);

    return base64Encode(payload);
}

export async function decrypt(ciphertext: string, keyHex: string): Promise<string> {
    const key = await importKey(keyHex);

    let payload: Uint8Array;
    try {
        payload = base64Decode(ciphertext);
    } catch {
        throw new CryptoError('Invalid ciphertext encoding');
    }

    if (payload.length < 13) {
        throw new CryptoError('Ciphertext too short');
    }

    const iv = payload.slice(0, 12);
    const data = payload.slice(12);

    let decrypted: ArrayBuffer;
    try {
        decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    } catch {
        throw new CryptoError('Decryption failed');
    }

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}
