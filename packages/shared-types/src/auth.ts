import { z } from 'zod';

export const phoneLoginRequestSchema = z.object({
    phone: z
        .string()
        .min(1)
        .regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must be in E.164 format'),
});

export const otpVerifyRequestSchema = z.object({
    phone: z
        .string()
        .min(1)
        .regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must be in E.164 format'),
    token: z.string().min(6).max(6),
});

export const authenticatedUserSchema = z.object({
    userId: z.uuid(),
    phone: z.string().nullable(),
});

export const authErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string(),
});

export type PhoneLoginRequest = z.infer<typeof phoneLoginRequestSchema>;
export type OtpVerifyRequest = z.infer<typeof otpVerifyRequestSchema>;
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type AuthErrorResponse = z.infer<typeof authErrorResponseSchema>;
