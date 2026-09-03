import crypto from 'crypto';
import { db } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || 'recoverai-secure-merchant-jwt-secret-key-2026';
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AuthUser {
  id: string;
  merchant_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AuthMerchant {
  id: string;
  name: string;
  currency: string;
  created_at: string;
}

export class AuthService {
  /**
   * Cryptographically hashes a password using PBKDF2 with 100,000 iterations of SHA-512
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const iterations = 100000;
    const keylen = 64;
    const digest = 'sha512';
    const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
    return `${iterations}:${salt}:${hash}`;
  }

  /**
   * Verifies password against stored hash using timing-safe comparison
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    try {
      const parts = storedHash.split(':');
      if (parts.length !== 3) return false;
      const iterations = parseInt(parts[0], 10);
      const salt = parts[1];
      const originalHash = parts[2];

      const derivedHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
      const originalBuffer = Buffer.from(originalHash, 'hex');
      const derivedBuffer = Buffer.from(derivedHash, 'hex');

      if (originalBuffer.length !== derivedBuffer.length) return false;
      return crypto.timingSafeEqual(originalBuffer, derivedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Generates a signed JWT bearer token
   */
  static generateToken(user: AuthUser): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.id,
      merchantId: user.merchant_id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: now,
      exp: now + TOKEN_EXPIRY_SECONDS
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verifies and decodes a signed JWT bearer token
   */
  static verifyToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      const expectedBuf = Buffer.from(expectedSignature);
      const actualBuf = Buffer.from(signature);
      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  static findUserByEmail(email: string): (AuthUser & { password_hash: string }) | null {
    const user = db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).get(email.trim()) as any;
    return user || null;
  }

  static findUserById(id: string): AuthUser | null {
    const user = db.prepare(`SELECT id, merchant_id, name, email, role, created_at FROM users WHERE id = ?`).get(id) as any;
    return user || null;
  }

  static findMerchantById(merchantId: string): AuthMerchant | null {
    const merchant = db.prepare(`SELECT * FROM merchants WHERE id = ?`).get(merchantId) as any;
    return merchant || null;
  }

  /**
   * Registers a new merchant and primary admin user
   */
  static signup(params: { name: string; email: string; password: string; companyName: string }): {
    token: string;
    user: AuthUser;
    merchant: AuthMerchant;
  } {
    const existing = this.findUserByEmail(params.email);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const merchantId = `M-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const userId = `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const passwordHash = this.hashPassword(params.password);

    const insertMerchant = db.prepare(`
      INSERT INTO merchants (id, name, currency, created_at)
      VALUES (?, ?, 'INR', ?)
    `);

    const insertUser = db.prepare(`
      INSERT INTO users (id, merchant_id, name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, 'merchant_admin', ?)
    `);

    db.transaction(() => {
      insertMerchant.run(merchantId, params.companyName.trim() || 'My Merchant Store', now);
      insertUser.run(userId, merchantId, params.name.trim(), params.email.trim().toLowerCase(), passwordHash, now);
    })();

    const user: AuthUser = {
      id: userId,
      merchant_id: merchantId,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      role: 'merchant_admin',
      created_at: now
    };

    const merchant: AuthMerchant = {
      id: merchantId,
      name: params.companyName.trim() || 'My Merchant Store',
      currency: 'INR',
      created_at: now
    };

    const token = this.generateToken(user);
    return { token, user, merchant };
  }

  /**
   * Authenticates user credentials
   */
  static login(params: { email: string; password: string }): {
    token: string;
    user: AuthUser;
    merchant: AuthMerchant;
  } {
    const userRecord = this.findUserByEmail(params.email);
    if (!userRecord) {
      throw new Error('Invalid email or password.');
    }

    const isValid = this.verifyPassword(params.password, userRecord.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password.');
    }

    const merchant = this.findMerchantById(userRecord.merchant_id);
    if (!merchant) {
      throw new Error('Associated merchant account not found.');
    }

    const user: AuthUser = {
      id: userRecord.id,
      merchant_id: userRecord.merchant_id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      created_at: userRecord.created_at
    };

    const token = this.generateToken(user);
    return { token, user, merchant };
  }

  /**
   * Provides immediate demo access with pre-configured synthetic Indian merchant
   */
  static demoLogin(): {
    token: string;
    user: AuthUser;
    merchant: AuthMerchant;
  } {
    const demoEmail = 'demo@desigadgets.in';
    let userRecord = this.findUserByEmail(demoEmail);

    const now = new Date().toISOString();

    // Ensure Demo Merchant exists
    const demoMerchantId = 'M-IND-001';
    let merchant = this.findMerchantById(demoMerchantId);
    if (!merchant) {
      db.prepare(`
        INSERT INTO merchants (id, name, currency, created_at)
        VALUES (?, 'Desi Gadgets Pvt Ltd', 'INR', ?)
      `).run(demoMerchantId, now);
      merchant = {
        id: demoMerchantId,
        name: 'Desi Gadgets Pvt Ltd',
        currency: 'INR',
        created_at: now
      };
    }

    // Ensure Demo User exists
    if (!userRecord) {
      const demoUserId = 'USR-DEMO-001';
      const passwordHash = this.hashPassword('Demo@123Password');
      db.prepare(`
        INSERT INTO users (id, merchant_id, name, email, password_hash, role, created_at)
        VALUES (?, ?, 'Aarav Sharma', ?, ?, 'merchant_admin', ?)
      `).run(demoUserId, demoMerchantId, demoEmail, passwordHash, now);

      userRecord = {
        id: demoUserId,
        merchant_id: demoMerchantId,
        name: 'Aarav Sharma',
        email: demoEmail,
        password_hash: passwordHash,
        role: 'merchant_admin',
        created_at: now
      };
    }

    const user: AuthUser = {
      id: userRecord.id,
      merchant_id: userRecord.merchant_id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      created_at: userRecord.created_at
    };

    const token = this.generateToken(user);
    return { token, user, merchant };
  }

  /**
   * Generates a password reset token
   */
  static createPasswordResetToken(email: string): { resetToken: string; userExists: boolean } {
    const user = this.findUserByEmail(email);
    if (!user) {
      return { resetToken: '', userExists: false };
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    const id = `RST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    db.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, user.id, resetToken, expiresAt, new Date().toISOString());

    return { resetToken, userExists: true };
  }

  /**
   * Validates reset token and sets new password
   */
  static resetPassword(token: string, newPassword: string): boolean {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const record = db.prepare(`
      SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0
    `).get(token) as any;

    if (!record) {
      throw new Error('Invalid or expired password reset token.');
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      throw new Error('Password reset token has expired.');
    }

    const newHash = this.hashPassword(newPassword);

    db.transaction(() => {
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(newHash, record.user_id);
      db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`).run(record.id);
    })();

    return true;
  }
}
