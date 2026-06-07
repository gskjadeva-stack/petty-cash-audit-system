/**
 * PLACEHOLDER: Supabase Auth JWT middleware
 *
 * Set ENFORCE_AUTH=true to activate JWT verification on all /api routes.
 * When inactive (default), requests pass through without auth enforcement.
 *
 * Activation requires:
 *   - SUPABASE_JWT_SECRET (from Supabase Dashboard > Settings > API > JWT Secret)
 *   - Optional: add `jose` package and uncomment verifyJwt() below
 */

function parseBearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
}

// PLACEHOLDER: Uncomment and install `jose` when activating JWT verification
// import { jwtVerify, createRemoteJWKSet } from 'jose';
// async function verifyJwt(token) {
//   const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
//   const { payload } = await jwtVerify(token, secret);
//   return payload;
// }

export function extractUserFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    full_name:
      payload.user_metadata?.full_name ||
      payload.user_metadata?.name ||
      payload.email?.split('@')[0] ||
      'User',
    role: payload.app_metadata?.role || payload.user_metadata?.role || 'user',
  };
}

export function authMiddleware(req, res, next) {
  const token = parseBearerToken(req);
  req.authToken = token;

  if (token) {
    req.user = extractUserFromToken(token);
  }

  const enforce = process.env.ENFORCE_AUTH === 'true';

  if (enforce) {
    if (!token || !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // PLACEHOLDER: When activating, replace decodeJwtPayload with verifyJwt(token)
    // to cryptographically verify the Supabase JWT signature.
  }

  next();
}

export { parseBearerToken };
