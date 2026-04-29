import { z } from "zod";

/**
 * Auth input schemas — used by both web and mobile for client-side validation
 * before talking to Supabase Auth. Server-side validation still happens in
 * Supabase regardless of these.
 */

export const emailSchema = z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email");

/**
 * Password rules. min(6) matches Supabase Auth's default minimum.
 * If the Supabase project tightens the requirement, the server error
 * surfaces back to the user via the auth response.
 */
export const passwordSchema = z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long");

/**
 * Username — matches the rule used server-side in
 * apps/web/src/app/auth/actions.ts so onboarding writes the same shape
 * the web app's persistGangMembership accepts.
 */
export const usernameSchema = z.string().trim().min(1, "Username is required").max(50, "Username is too long");

export const signUpInputSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

export const signInInputSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
});

export const forgotPasswordInputSchema = z.object({
    email: emailSchema,
});

export const resetPasswordInputSchema = z
    .object({
        password: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type SignInInput = z.infer<typeof signInInputSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
