const bcrypt = require('bcrypt');
import { TokenPayload } from './jwtService';

export type UserRole = 'doctor' | 'nurse' | 'admin' | 'support';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// In-memory user store (replace with database in production)
// For demo purposes, we'll use a simple in-memory store
const users: Map<string, User> = new Map();

// Initialize with default users (for development/demo)
// In production, these should be created through an admin interface
const SALT_ROUNDS = 10;

async function initializeDefaultUsers() {
  // Default admin user: admin@aarogya-setu.com / admin123
  const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
  users.set('admin@aarogya-setu.com', {
    id: 'user-admin-001',
    email: 'admin@aarogya-setu.com',
    passwordHash: adminPassword,
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date(),
    isActive: true,
  });

  // Default doctor user: doctor@aarogya-setu.com / doctor123
  const doctorPassword = await bcrypt.hash('doctor123', SALT_ROUNDS);
  users.set('doctor@aarogya-setu.com', {
    id: 'user-doctor-001',
    email: 'doctor@aarogya-setu.com',
    passwordHash: doctorPassword,
    name: 'Dr. Ravi Kumar',
    role: 'doctor',
    createdAt: new Date(),
    isActive: true,
  });

  // Default nurse user: nurse@aarogya-setu.com / nurse123
  const nursePassword = await bcrypt.hash('nurse123', SALT_ROUNDS);
  users.set('nurse@aarogya-setu.com', {
    id: 'user-nurse-001',
    email: 'nurse@aarogya-setu.com',
    passwordHash: nursePassword,
    name: 'Nurse Priya',
    role: 'nurse',
    createdAt: new Date(),
    isActive: true,
  });

  console.log('✅ Default users initialized');
  console.log('   Admin: admin@aarogya-setu.com / admin123');
  console.log('   Doctor: doctor@aarogya-setu.com / doctor123');
  console.log('   Nurse: nurse@aarogya-setu.com / nurse123');
}

// Initialize on module load
initializeDefaultUsers().catch(console.error);

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const user = users.get(email.toLowerCase());
  return user || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  for (const user of users.values()) {
    if (user.id === id) {
      return user;
    }
  }
  return null;
}

/**
 * Verify password
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Create new user
 */
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole = 'doctor'
): Promise<User> {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: email.toLowerCase(),
    passwordHash,
    name,
    role,
    createdAt: new Date(),
    isActive: true,
  };

  users.set(user.email, user);
  return user;
}

/**
 * Update user last login
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (user) {
    user.lastLogin = new Date();
    users.set(user.email, user);
  }
}

/**
 * Get user token payload
 */
export function getUserTokenPayload(user: User): TokenPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

