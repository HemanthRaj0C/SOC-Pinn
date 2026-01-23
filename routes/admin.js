const express = require('express');
const { db } = require('../config/firebase');
const { collection, query, where, getDocs } = require('firebase/firestore');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// Get scoreboard
router.get('/scoreboard', async (req, res) => {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('role', '==', 'user'));
    const teamsSnapshot = await getDocs(q);
    
    const scoreboard = [];
    teamsSnapshot.forEach(docSnap => {
      const team = docSnap.data();
      scoreboard.push({
        teamId: docSnap.id,
        teamName: team.teamName,
        username: team.username,
        teamMembers: team.teamMembers,
        assignedPS: team.assignedPS,
        submissions: team.submissions || []
      });
    });

    res.json(scoreboard);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
