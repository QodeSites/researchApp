// pages/api/login.js
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // If the method is not POST, return a 405 error.
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, password } = req.body;

  // Replace this dummy check with your own authentication logic
  if (username === 'research@qodeinvest.com' && password === 'Execution@123') {
    // Create a dummy token (in production, generate a secure token or session ID)
    const token = 'dummy_token';

    // Set a cookie on the client. Adjust cookie options as needed.
    res.setHeader(
      'Set-Cookie',
      serialize('auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
        maxAge: 60 * 60 * 24 * 7, // Cookie valid for 1 week
        path: '/',
      })
    );

    return res.status(200).json({ message: 'Login successful' });
  }

  // If credentials are invalid, return an error.
  res.status(401).json({ message: 'Invalid credentials' });
}
