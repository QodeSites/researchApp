import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// pages/api/generate-token.js
export default async function handler(req, res) {
  try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execPromise = promisify(exec);

      // Run the token generation script
      const { stdout, stderr } = await execPromise(`python ./pythonCodes/token_generation_script.py`);
      
      if (!stdout.trim()) {
        console.error('Token generation failed: Empty token returned');
        return res.status(500).json({ error: 'Failed to generate token' });
      }

      const requestToken = stdout.trim();  // Ensure to trim any whitespace
      if (!requestToken) {
          console.error('Token generation failed: Empty token returned');
          return res.status(500).json({ error: 'Failed to generate token' });
      }

      return res.status(200).json({
          status:"success",
          message: 'Token generated successfully',
          token: requestToken
      });


  } catch (error) {
      console.error('Token generation failed:', error);
      res.status(500).json({ error: 'Token generation failed' });
  }
}
