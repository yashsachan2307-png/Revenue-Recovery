import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authMiddleware, AuthenticatedRequest } from './middleware/authMiddleware';

const router = Router();

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const authResult = AuthService.login({ email, password });
    return res.json(authResult);
  } catch (error: any) {
    return res.status(401).json({ error: error.message || 'Authentication failed.' });
  }
});

// POST /api/auth/signup
router.post('/signup', (req: Request, res: Response) => {
  try {
    const { name, email, password, companyName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const authResult = AuthService.signup({
      name,
      email,
      password,
      companyName: companyName || 'Merchant Store'
    });
    return res.status(201).json(authResult);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Signup failed.' });
  }
});

// POST /api/auth/demo
router.post('/demo', (req: Request, res: Response) => {
  try {
    const authResult = AuthService.demoLogin();
    return res.json(authResult);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Demo login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const user = AuthService.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const merchant = AuthService.findMerchantById(user.merchant_id);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found.' });
    }

    return res.json({ user, merchant });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const { resetToken, userExists } = AuthService.createPasswordResetToken(email);
    
    // For demo/development ease, return the simulated reset token in response so user can test reset immediately
    return res.json({
      success: true,
      userExists,
      message: 'If an account matches this email, a password reset token has been generated.',
      resetToken: userExists ? resetToken : undefined
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    AuthService.resetPassword(token, newPassword);
    return res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Password reset failed.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  // Stateless JWT: client clears token, but endpoint confirms logout
  return res.json({ success: true, message: 'Logged out successfully.' });
});

export { router as authRouter };
