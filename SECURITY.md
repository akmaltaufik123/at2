# Security Configuration Guide

This document outlines the security measures implemented and required actions for the Supabase dashboard.

## Client-Side Fixes (Implemented)

The following security improvements have been made to the frontend code:

### 1. Rate Limiting on Authentication
- **File**: `js/portal.js`
- **What**: Centralized rate limiting for login/registration attempts
- **Limits**: 5 attempts per 5 seconds, 5-minute lockout after max attempts

### 2. Registration Form Protection
- **File**: `register.html`
- **What**: Enhanced rate limiting, password strength validation, honeypot field
- **Limits**: 60-second cooldown between attempts, 3 attempts before 5-minute lockout

### 3. Admin Panel Security
- **File**: `admin.html`
- **What**: Security warning banner, enhanced admin verification
- **Note**: Admin access requires `is_admin` flag in `app_metadata`

### 4. Security Headers
- **File**: `_headers`
- **What**: Enhanced security headers including:
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `X-Permitted-Cross-Domain-Policies: none`
  - `X-XSS-Protection: 1; mode=block`
  - Cache control for sensitive pages

### 5. Robots.txt Protection
- **File**: `robots.txt`
- **What**: Blocked sensitive paths from search engines:
  - `/admin.html`
  - `/register.html`
  - `/dashboard.html`
  - `/js/supabase-config.js`
  - `/supabase/`
  - `/deploy/`
  - `/tests/`

---

## Required Supabase Dashboard Actions

The following actions **MUST** be performed in the Supabase dashboard to fully secure the application:

### CRITICAL: Disable Public Signup

**Location**: Supabase Dashboard → Authentication → Providers → Email

**Actions**:
1. Set **"Enable Email Provider"** to `ON` (keep enabled for existing users)
2. Set **"Confirm Email"** to `ON` (require email verification)
3. **IMPORTANT**: If you need to disable public signup entirely:
   - Go to Authentication → URL Configuration
   - Set **"Disable Signup"** to `ON`
   - Only admins will be able to create new users

### CRITICAL: Configure Row Level Security (RLS)

**Location**: Supabase Dashboard → Authentication → Policies

**Actions**:
1. Enable RLS on all tables:
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
   ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
   ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
   ```

2. Create policies to restrict access:
   ```sql
   -- Users can only read their own profile
   CREATE POLICY "Users can view own profile"
   ON profiles FOR SELECT
   USING (auth.uid() = id);

   -- Users can only update their own profile
   CREATE POLICY "Users can update own profile"
   ON profiles FOR UPDATE
   USING (auth.uid() = id);

   -- Admins can access all profiles
   CREATE POLICY "Admins can view all profiles"
   ON profiles FOR SELECT
   USING (auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true');

   -- Users can only view their own requests
   CREATE POLICY "Users can view own requests"
   ON service_requests FOR SELECT
   USING (auth.uid() = user_id);

   -- Admins can manage all requests
   CREATE POLICY "Admins can manage all requests"
   ON service_requests FOR ALL
   USING (auth.jwt() -> 'app_metadata' ->> 'is_admin' = 'true');
   ```

### HIGH: Enable Auth Rate Limiting

**Location**: Supabase Dashboard → Authentication → Rate Limits

**Recommended Settings**:
- Rate limit for sign in: `5` requests per `1` minute
- Rate limit for sign up: `3` requests per `1` minute
- Rate limit for password recovery: `3` requests per `1` hour

### HIGH: Configure Email Templates

**Location**: Supabase Dashboard → Authentication → Email Templates

**Actions**:
1. Customize email templates to match your brand
2. Ensure verification emails are clear and professional
3. Add security warnings about sharing credentials

### MEDIUM: Enable Multi-Factor Authentication (MFA)

**Location**: Supabase Dashboard → Authentication → Multi-factor authentication

**Actions**:
1. Enable MFA for admin accounts
2. Consider requiring MFA for all users handling sensitive data

### MEDIUM: Configure Session Settings

**Location**: Supabase Dashboard → Authentication → URL Configuration

**Recommended Settings**:
- Session timeout: `3600` seconds (1 hour)
- Refresh token rotation: `ON`
- Revoke refresh tokens on reuse: `ON`

---

## Supabase Anon Key Security Note

The Supabase anon key (`sb_publishable_...`) is **intentionally public** and safe to expose in client-side code. This is by design in Supabase's security model.

**Why it's safe**:
- The anon key is meant to be used in client-side code
- Security is enforced through Row Level Security (RLS) policies
- The anon key can only access data that RLS policies allow

**What you must do**:
- Ensure RLS is enabled on ALL tables
- Create restrictive policies for each table
- Test policies thoroughly before deploying

---

## Testing Your Security Configuration

After implementing the above changes, test your security:

### 1. Test Signup Protection
```bash
# This should fail if signup is disabled
curl -X POST "https://lmvgxcdlnpckmqjjsqwf.supabase.co/auth/v1/signup" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### 2. Test RLS Policies
```bash
# This should only return the authenticated user's data
curl "https://lmvgxcdlnpckmqjjsqwf.supabase.co/rest/v1/profiles" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer USER_JWT"
```

### 3. Test Admin Access
```bash
# This should only work for admin users
curl "https://lmvgxcdlnpckmqjjsqwf.supabase.co/rest/v1/service_requests" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer ADMIN_JWT"
```

---

## Monitoring and Logging

### Enable Supabase Logs
**Location**: Supabase Dashboard → Logs

**Actions**:
1. Enable all log types
2. Set up log drains to your preferred logging service
3. Monitor for suspicious activity

### Set Up Alerts
**Location**: Supabase Dashboard → Alerts

**Recommended Alerts**:
- Failed login attempts > 10 per minute
- New user registrations > 5 per hour
- Unusual API usage patterns

---

## Incident Response

If you suspect a security breach:

1. **Immediately rotate the anon key** in Supabase dashboard
2. **Revoke all active sessions** in Authentication → Sessions
3. **Review audit logs** for suspicious activity
4. **Update client code** with new anon key
5. **Notify affected users** if data was compromised

---

## Contact

For security concerns or questions, contact:
- Email: founder@akmaltaufikenterprise.my
- WhatsApp: +60 18-945 1570

---

**Last Updated**: 2026-11-21
**Document Version**: 1.0
