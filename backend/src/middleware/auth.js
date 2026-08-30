function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, headerToken] = header.split(' ');

  // Browsers cannot attach custom headers to <iframe>/<img> src requests, which
  // the file-preview panel relies on, so we also accept the token as a query
  // param (?token=) for GET requests as a pragmatic fallback. All other routes
  // are called via fetch() and always use the Authorization header.
  const token = scheme === 'Bearer' && headerToken ? headerToken : req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header. Expected: Bearer <token>' });
  }

  const expected = process.env.AUTH_TOKEN;
  if (!expected || token !== expected) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  next();
}

module.exports = { requireAuth };
