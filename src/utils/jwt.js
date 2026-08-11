const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiresIn } = require("../config/appConfig");
/**
 * Generate JWT Token
 * @param {Object} user
 * @returns {string}
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      mobile: user.mobile
    },
    jwtSecret,
    {
      expiresIn: jwtExpiresIn
    }
  );
}

/**
 * Verify JWT Token
 * @param {string} token
 * @returns {Object|null}
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (err) {
    return null;
  }
}

/**
 * Decode Token without verification
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};