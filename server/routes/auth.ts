import express, { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  changePassword,
  deleteUser,
  getUserById,
} from '../services/auth';
import { authenticate } from '../middleware/auth';
import logger, { ErrorType, logError } from '../services/logger';

const router = express.Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    const { user, token } = await registerUser(email, username, password);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
  } catch (error: any) {
    logError(error, ErrorType.VALIDATION, { context: 'register' });
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;

    const { user, token } = await loginUser(emailOrUsername, password);

    res.json({
      message: 'Login successful',
      user,
      token,
    });
  } catch (error: any) {
    logError(error, ErrorType.AUTHENTICATION, { context: 'login' });
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authenticate, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error: any) {
    logError(error, ErrorType.DATABASE, { context: 'getProfile' });
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Change password
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { oldPassword, newPassword } = req.body;

    await changePassword(req.user.userId, oldPassword, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    logError(error, ErrorType.VALIDATION, {
      context: 'changePassword',
      userId: req.user?.userId,
    });
    res.status(400).json({ error: error.message || 'Password change failed' });
  }
});

// Delete account
router.delete('/account', authenticate, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    deleteUser(req.user.userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    logError(error, ErrorType.DATABASE, {
      context: 'deleteAccount',
      userId: req.user?.userId,
    });
    res.status(500).json({ error: 'Account deletion failed' });
  }
});

// Verify token (useful for frontend to check if token is still valid)
router.get('/verify', authenticate, (req: Request, res: Response) => {
  res.json({ valid: true, user: req.user });
});

export default router;
