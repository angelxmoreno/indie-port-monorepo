import { useAuth } from '@indieport/shared-fe';
import { otpVerifyRequestSchema, phoneLoginRequestSchema } from '@indieport/shared-types';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useState } from 'react';
import { useNavigate } from 'react-router';

const DEFAULT_COUNTRY = 'US' as const;

function formatToE164(input: string): string | null {
    const parsed = parsePhoneNumberFromString(input, DEFAULT_COUNTRY);
    if (!parsed?.isValid()) return null;
    return parsed.format('E.164');
}

function formatDisplay(input: string): string {
    const parsed = parsePhoneNumberFromString(input, DEFAULT_COUNTRY);
    return parsed?.formatNational() ?? input;
}

export function LoginPage() {
    const { signInWithOtp, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const [rawPhone, setRawPhone] = useState('');
    const [token, setToken] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSendOtp() {
        setError(null);
        const e164 = formatToE164(rawPhone);
        if (!e164) {
            setError('Invalid phone number');
            return;
        }

        const result = phoneLoginRequestSchema.safeParse({ phone: e164 });
        if (!result.success) {
            setError(result.error.issues[0]?.message ?? 'Invalid phone number');
            return;
        }

        setLoading(true);
        try {
            await signInWithOtp(result.data.phone);
            setOtpSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp() {
        setError(null);
        const e164 = formatToE164(rawPhone);
        if (!e164) {
            setError('Invalid phone number');
            return;
        }

        const result = otpVerifyRequestSchema.safeParse({ phone: e164, token });
        if (!result.success) {
            setError(result.error.issues[0]?.message ?? 'Invalid verification code');
            return;
        }

        setLoading(true);
        try {
            await verifyOtp(result.data.phone, result.data.token);
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
        } finally {
            setLoading(false);
        }
    }

    function handleBack() {
        setOtpSent(false);
        setToken('');
        setError(null);
    }

    return (
        <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
            <h1>Sign in to IndiePort</h1>

            {!otpSent ? (
                <>
                    <label htmlFor="phone">Phone number</label>
                    <input
                        id="phone"
                        type="tel"
                        value={rawPhone}
                        onChange={(e) => setRawPhone(e.target.value)}
                        placeholder="(347) 980-9243"
                        disabled={loading}
                        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
                    />
                    <button type="button" onClick={handleSendOtp} disabled={loading} style={{ padding: '8px 16px' }}>
                        {loading ? 'Sending...' : 'Send verification code'}
                    </button>
                </>
            ) : (
                <>
                    <p>Verification code sent to {formatDisplay(rawPhone)}</p>
                    <label htmlFor="token">Verification code</label>
                    <input
                        id="token"
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        disabled={loading}
                        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={loading}
                            style={{ padding: '8px 16px' }}
                        >
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                        <button type="button" onClick={handleBack} disabled={loading} style={{ padding: '8px 16px' }}>
                            Back
                        </button>
                    </div>
                </>
            )}

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}
