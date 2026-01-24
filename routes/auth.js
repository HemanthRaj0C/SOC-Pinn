const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { collection, query, where, getDocs } = require('firebase/firestore');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get team by username
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('username', '==', username));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const teamDoc = snapshot.docs[0];
    const team = teamDoc.data();

    // Verify password
    const isValid = await bcrypt.compare(password, team.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT with expiration (SECURITY FIX #5: Token expires in 24 hours)
    const token = jwt.sign(
      { id: teamDoc.id, username: team.username, role: team.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: teamDoc.id,
        username: team.username,
        teamName: team.teamName,
        role: team.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
