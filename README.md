# Secure Authentication System

A complete authentication system built with Node.js, Express.js and MongoDB. It covers signup with email verification, JWT login with access and refresh tokens, forgot and reset password, Google OAuth, and two-factor authentication (2FA) with an authenticator app. The focus of the project is token security.

**Live demo:** https://secure-auth-system-j7a7.onrender.com
**Repository:** https://github.com/hariomtiwari80/Secure-Auth-System-

> The demo runs on a free Render instance, so the first load may take a minute while it wakes up.

## Features

- **Signup with email verification:** new accounts must verify their email through a link before they can log in
- **JWT login** with a short-lived access token and a long-lived refresh token
- **Silent token refresh** that issues a new access token and a new refresh token
- **Forgot and reset password** using hashed, expiring reset tokens
- **Google OAuth login** with ID token verification
- **Two-factor authentication (2FA)** using time-based one-time passwords (TOTP) from an authenticator app
- **Instant session invalidation** across all devices when a password is reset
- **Input validation** with Zod and **password hashing** with bcrypt

## Tech Stack

| Area | Technologies |
| --- | --- |
| Runtime and framework | Node.js, Express.js |
| Database | MongoDB |
| Tokens | JSON Web Tokens (`jsonwebtoken`) |
| Validation | Zod |
| Password hashing | bcrypt |
| Google sign-in | `google-auth-library` |
| 2FA | `otplib` (TOTP) |

## Security Design

- **Short-lived access token, long-lived refresh token.** The access token is returned in the response body. The refresh token is stored in an HttpOnly cookie, so client-side JavaScript can never read it. The cookie is marked `Secure` in production, uses `SameSite=Lax` and lasts 7 days.
- **Token versioning.** JWTs are stateless, so once one is created the server cannot cancel or delete it, and it stays valid until it expires. That is a problem when someone resets their password, because their old tokens would still work. To solve it, each user has a `tokenVersion` number that starts at 0, and every token carries that number. When a refresh token is used, its number is checked against the one currently stored for the user. A password reset increases `tokenVersion` by one, so every token signed before it is rejected automatically, even on other devices.
- **Reset tokens are hashed.** The forgot-password flow generates a random token, stores only its SHA-256 hash and a 15-minute expiry in the database, and emails the raw token in the reset link. Even if the database leaks, the stored hashes cannot be used to reset a password.
- **No account enumeration.** The forgot-password endpoint gives the same response whether or not the email exists.
- **Passwords are hashed with bcrypt**, and requests are validated with Zod before any database work.
- **Email verification links** are signed JWTs that expire after 15 minutes.
- **Google login requires a verified email.** The ID token is verified with Google and the request is rejected if Google has not verified the email. New Google users get a random password that is hashed.
- **2FA is only switched on after the first code is verified.** Setup stores the secret but leaves `twoFactorEnabled` false until the user proves the authenticator app works.

## How It Works

### Register
Validate input with Zod → check whether the email already exists → hash the password → save the user with `isEmailVerified: false` → sign a token for email verification → email a verify link → respond `201`.

### Verify email
Take the token from the query string → verify the token → find the user in the database → set `isEmailVerified: true`.

### Login
Validate input → find the user by email → compare the password with bcrypt → block the user if the email is not verified → if 2FA is enabled, verify the 6-digit time-based code → sign an access token and a refresh token → set the refresh token in an HttpOnly cookie → respond with the access token.

### Refresh
Read the refresh token from the cookie → verify it → find the user → check that `tokenVersion` matches → sign a new access token and a new refresh token → set the new cookie.

### Logout
Clear the refresh token cookie.

### Forgot password
Find the user by email → generate a random raw token → store its SHA-256 hash and a 15-minute expiry in the database → email the raw token in a reset link.

### Reset password
Hash the token from the link → find a user with a matching hash whose expiry has not passed → hash the new password → clear the reset fields → increment `tokenVersion` → save the user.

### Google OAuth
Start: redirect the user to Google. Callback: Google redirects back with a code → exchange it for tokens → verify the ID token → read the email and `email_verified` → reject if Google has not verified the email → find the user, or create a new one with a random hashed password → issue the access token and refresh cookie.

### Two-factor authentication
- **Setup:** generate a secret for the logged-in user → build an `otpauth` URL for the authenticator app → save the secret and keep `twoFactorEnabled` false.
- **Verify:** take the 6-digit code the user typed from their authenticator app → verify it against the stored secret → if correct, set `twoFactorEnabled` to true. From then on, login demands a code every time.

## Handlers

| Handler | Purpose |
| --- | --- |
| `registerHandler` | Create an account and send the verification email |
| `verifyEmailHandler` | Mark the email as verified |
| `loginHandler` | Check credentials (and the 2FA code if enabled) and issue tokens |
| `refreshHandler` | Issue a new access token and rotate the refresh token |
| `logoutHandler` | Clear the refresh token cookie |
| `forgotPasswordHandler` | Email a password reset link |
| `resetPasswordHandler` | Set a new password and invalidate old tokens |
| `googleAuthStartHandler` | Redirect to Google sign-in |
| `googleAuthCallbackHandler` | Finish Google login |
| `twoFASetuphandler` | Generate a 2FA secret and `otpauth` URL |
| `twoFAVerifyHandler` | Confirm the first code and turn 2FA on |

## User Schema

| Field | Description |
| --- | --- |
| `name` | User's name |
| `email` | Unique, stored lowercase and trimmed |
| `password` | bcrypt hash |
| `role` | `user` by default |
| `isEmailVerified` | Must be true to log in |
| `twoFactorEnabled` | Whether login requires a TOTP code |
| `twoFactorSecret` | Secret used to verify TOTP codes |
| `tokenVersion` | Starts at 0 and increases on password reset |
| `resetPasswordToken` | SHA-256 hash of the reset token |
| `resetPasswordExpires` | Expiry time of the reset token |

## Getting Started

### Prerequisites

- Node.js
- A MongoDB database
- A Google Cloud OAuth client (client ID, client secret and redirect URL)
- An email account or service for sending verification and reset emails

### Installation

```bash
git clone https://github.com/hariomtiwari80/Secure-Auth-System-.git
cd Secure-Auth-System-
npm install
```

### Environment variables

Create a `.env` file with these values:

```env
NODE_ENV=development
CLIENT_URL=<frontend URL>
JWT_ACCESS_SECRET=<long random secret>
GOOGLE_CLIENT_ID=<Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
GOOGLE_REDIRECT_URL=<Google OAuth redirect URL>
```

The project also needs a MongoDB connection string, the secret used to sign refresh tokens, and the credentials for your email sender. Add them using the variable names in your code.

Never commit your `.env` file.

### Run

```bash
npm run dev
```

## Author

**Hariom Tiwari**
GitHub: [hariomtiwari80](https://github.com/hariomtiwari80)