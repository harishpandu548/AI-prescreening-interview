import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

export class AuthService {
  static async hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }

  static generateAccessToken(user: { id: string, email: string, role: string }) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  }

  static generateRefreshToken(user: { id: string }) {
    return jwt.sign(
      { id: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }

  static verifyAccessToken(token: string) {
    try {
      return jwt.verify(token, ACCESS_SECRET);
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token: string) {
    try {
      return jwt.verify(token, REFRESH_SECRET);
    } catch (error) {
      return null;
    }
  }
}
