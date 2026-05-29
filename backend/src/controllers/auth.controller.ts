import { Request, Response } from 'express';
import { prisma } from '../index.js';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, role } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await AuthService.hashPassword(password);
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, role: role || 'HR' }
      });

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);

      res.status(201).json({ user, accessToken, refreshToken });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isPasswordValid = await AuthService.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = AuthService.generateRefreshToken(user);

      res.status(200).json({ user, accessToken, refreshToken });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
