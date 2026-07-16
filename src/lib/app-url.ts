// Base URL embedded in auth e-mails (confirmation, password reset, invite
// signup). Always the production URL — never a developer's localhost — so
// links in e-mails work for real users no matter where the form was submitted.
export const AUTH_EMAIL_BASE =
    process.env.NEXT_PUBLIC_APP_URL || 'https://houseconstruction.vercel.app';
