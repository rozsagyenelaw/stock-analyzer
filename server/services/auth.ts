import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './database';
import logger, { ErrorType, logError } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const SALT_ROUNDS = 10;

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  username: string;
}

// Initialize users table
export function initializeUsersTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active INTEGER DEFAULT 1
    )
  `;

  try {
    db.exec(createTableQuery);
    logger.info('Users table initialized');
  } catch (error: any) {
    logError(error, ErrorType.DATABASE, { context: 'initializeUsersTable' });
    throw error;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error: any) {
    logError(error, ErrorType.AUTHENTICATION, { context: 'verifyToken' });
    throw new Error('Invalid or expired token');
  }
}

// Register new user
export async function registerUser(
  email: string,
  username: string,
  password: string
): Promise<{ user: User; token: string }> {
  // Validate input
  if (!email || !username || !password) {
    throw new Error('Email, username, and password are required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  try {
    // Check if user already exists
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
      .get(email, username);

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const result = db
      .prepare(
        'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)'
      )
      .run(email, username, passwordHash);

    const userId = result.lastInsertRowid as number;

    // Get user without password
    const user = db
      .prepare('SELECT id, email, username, created_at FROM users WHERE id = ?')
      .get(userId) as User;

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    logger.info('User registered successfully', { userId, email, username });

    return { user, token };
  } catch (error: any) {
    logError(error, ErrorType.DATABASE, { context: 'registerUser', email, username });
    throw error;
  }
}

// Login user
export async function loginUser(
  emailOrUsername: string,
  password: string
): Promise<{ user: User; token: string }> {
  if (!emailOrUsername || !password) {
    throw new Error('Email/username and password are required');
  }

  try {
    // Find user by email or username
    const userWithPassword = db
      .prepare(
        'SELECT id, email, username, password_hash, created_at FROM users WHERE email = ? OR username = ? AND is_active = 1'
      )
      .get(emailOrUsername, emailOrUsername) as UserWithPassword | undefined;

    if (!userWithPassword) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await verifyPassword(password, userWithPassword.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(
      userWithPassword.id
    );

    // Remove password from user object
    const { password_hash, ...user } = userWithPassword;

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    return { user, token };
  } catch (error: any) {
    logError(error, ErrorType.AUTHENTICATION, { context: 'loginUser', emailOrUsername });
    throw error;
  }
}

// Get user by ID
export function getUserById(userId: number): User | undefined {
  try {
    return db
      .prepare('SELECT id, email, username, created_at FROM users WHERE id = ? AND is_active = 1')
      .get(userId) as User | undefined;
  } catch (error: any) {
    logError(error, ErrorType.DATABASE, { context: 'getUserById', userId });
    return undefined;
  }
}

// Get user by email
export function getUserByEmail(email: string): User | undefined {
  try {
    return db
      .prepare('SELECT id, email, username, created_at FROM users WHERE email = ? AND is_active = 1')
      .get(email) as User | undefined;
  } catch (error: any) {
    logError(error, ErrorType.DATABASE, { context: 'getUserByEmail', email });
    return undefined;
  }
}

// Change password
export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  try {
    // Get current password hash
    const user = db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(userId) as { password_hash: string } | undefined;

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValid = await verifyPassword(oldPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, userId);

    logger.info('Password changed successfully', { userId });
  } catch (error: any) {
    logError(error, ErrorType.DATABASE, { context: 'changePassword', userId });
    throw error;
  }
}

// Delete user (soft delete)
export function deleteUser(userId: number): void {
  try {
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
    logger.info('User deactivated', { userId });
  } catch (error: any) {
    logError(error, ErrorType.DATABASE, { context: 'deleteUser', userId });
    throw error;
  }
}
