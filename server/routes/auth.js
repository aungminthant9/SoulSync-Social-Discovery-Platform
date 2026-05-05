const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabase');

const router = express.Router();

// Supabase admin client (for auth operations like password reset emails)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ============================================
// POST /api/auth/register
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, dob, gender, city, country } = req.body;

    // Validate required fields
    if (!name || !email || !password || !dob || !gender) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    // Age verification (must be 18+)
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      return res.status(403).json({ error: 'You must be at least 18 years old to register.' });
    }

    // Check if email already exists in our custom table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // ── Step 1: Create Supabase Auth user ──────────────────────
    // Syncs the email into auth.users so password-reset emails work.
    // email_confirm: true skips the confirmation step (we manage auth ourselves).
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      console.error('Supabase Auth createUser error:', authError);
      return res.status(500).json({ error: 'Failed to create account.' });
    }

    // ── Step 2: Hash password & insert into our custom users table ─
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash,
        dob,
        gender,
        city: city || '',
        country: country || '',
      })
      .select('id, name, email, avatar_url, credits, points')
      .single();

    if (dbError) {
      // Rollback: remove the Supabase Auth user to prevent orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Supabase DB insert error:', dbError);
      return res.status(500).json({ error: 'Failed to create account.' });
    }

    // ── Step 3: Generate our custom JWT ──────────────────────────
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: newUser,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password_hash, avatar_url, credits, points, is_banned, is_suspended, warnings_count')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Block banned users from logging in
    if (user.is_banned) {
      return res.status(403).json({
        error: 'Your account has been permanently banned for violating our Community Guidelines. If you believe this is a mistake, please contact support.',
        code: 'ACCOUNT_BANNED',
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Don't send password_hash to client
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful!',
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// POST /api/auth/forgot-password
// ============================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    // Check if user exists in our users table
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Always respond with success to prevent email enumeration attacks
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Use Supabase Admin Auth to send a password reset email
    const redirectUrl = `${process.env.CLIENT_URL}/reset-password`;
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase().trim(),
      options: { redirectTo: redirectUrl },
    });

    if (error) {
      console.error('Supabase generateLink error:', error);
      return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ============================================
// POST /api/auth/reset-password
// ============================================
router.post('/reset-password', async (req, res) => {
  try {
    const { access_token, password } = req.body;

    if (!access_token || !password) {
      return res.status(400).json({ error: 'Access token and new password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Verify the access token via Supabase and get the user
    const { data: { user: supaUser }, error: userError } = await supabaseAdmin.auth.getUser(access_token);

    if (userError || !supaUser) {
      return res.status(401).json({ error: 'Invalid or expired reset token. Please request a new one.' });
    }

    // Hash the new password and update our custom users table
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('email', supaUser.email);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password.' });
    }

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
