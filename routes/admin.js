const express = require('express');
const { db } = require('../config/firebase');
const { collection, doc, getDoc, updateDoc, query, where, getDocs } = require('firebase/firestore');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// Get all submissions for review
router.get('/submissions', async (req, res) => {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('role', '==', 'user'));
    const teamsSnapshot = await getDocs(q);
    
    const submissions = [];
    teamsSnapshot.forEach(docSnap => {
      const team = docSnap.data();
      submissions.push({
        teamId: docSnap.id,
        teamName: team.teamName,
        username: team.username,
        teamMembers: team.teamMembers,
        assignedPS: team.assignedPS,
        submissions: team.submissions || []
      });
    });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Score a submission
router.post('/score/:teamId/:psNumber', async (req, res) => {
  try {
    const { teamId, psNumber } = req.params;
    const { score } = req.body;

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ message: 'Invalid score' });
    }

    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    
    if (!teamDoc.exists()) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const team = teamDoc.data();
    const submissions = team.submissions || [];
    
    // Find and update the submission
    const updatedSubmissions = submissions.map(s => {
      if (s.psNumber === parseInt(psNumber)) {
        return { ...s, score, scoredAt: new Date().toISOString() };
      }
      return s;
    });

    await updateDoc(teamRef, { submissions: updatedSubmissions });

    res.json({ message: 'Score updated successfully', score });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get scoreboard
router.get('/scoreboard', async (req, res) => {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('role', '==', 'user'));
    const teamsSnapshot = await getDocs(q);
    
    const scoreboard = [];
    teamsSnapshot.forEach(docSnap => {
      const team = docSnap.data();
      
      // Calculate total score
      const totalScore = (team.submissions || []).reduce((sum, sub) => {
        return sum + (sub.score || 0);
      }, 0);
      
      scoreboard.push({
        teamId: docSnap.id,
        teamName: team.teamName,
        username: team.username,
        teamMembers: team.teamMembers,
        assignedPS: team.assignedPS,
        submissions: team.submissions || [],
        totalScore
      });
    });

    // Sort by total score descending
    scoreboard.sort((a, b) => b.totalScore - a.totalScore);

    res.json(scoreboard);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
