import TokenManager from '../security/token-manager.js';
import response from '../utils/response.js';

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split('Bearer ')[1];

      const user = TokenManager.verifyAccessToken(token);

      req.user = user;

      return next();
    } catch (error) {
      return response(res, 401, error.message, null);
    }
  }

  return response(res, 401, 'Unauthorized', null);
}

export default authenticateToken;