const express = require('express');
const { db } = require('../config/firebase');
const { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } = require('firebase/firestore');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// Get all teams with their submission progress
router.get('/submissions', async (req, res) => {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('role', '==', 'user'));
    const teamsSnapshot = await getDocs(q);
    
    const teams = [];
    teamsSnapshot.forEach(docSnap => {
      const team = docSnap.data();
      
      // Format scores for admin view
      const psProgress = {};
      for (let psNum = 1; psNum <= 6; psNum++) {
        const psScores = team.scores?.psScores?.[psNum];
        psProgress[psNum] = {
          totalScore: psScores?.totalScore || 0,
          questions: {}
        };
        
        for (let q = 0; q < 12; q++) {
          const questionData = psScores?.questions?.[q];
          psProgress[psNum].questions[q] = {
            isCompleted: questionData?.isCompleted || false,
            score: questionData?.score || 0,
            attempts: questionData?.attempts || 0,
            completedAt: questionData?.completedAt || null,
            isFirstBlood: questionData?.isFirstBlood || false
          };
        }
      }
      
      teams.push({
        teamId: docSnap.id,
        teamName: team.teamName,
        username: team.username,
        teamMembers: team.teamMembers,
        totalScore: team.scores?.totalScore || 0,
        psProgress
      });
    });

    // Sort by total score descending
    teams.sort((a, b) => b.totalScore - a.totalScore);

    res.json(teams);
  } catch (error) {
    console.error('Admin submissions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get first bloods
router.get('/firstbloods', async (req, res) => {
  try {
    const firstBloodsRef = collection(db, 'firstBloods');
    const snapshot = await getDocs(firstBloodsRef);
    
    const firstBloods = {};
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      firstBloods[data.psNumber] = data.questions;
    });
    
    res.json(firstBloods);
  } catch (error) {
    console.error('First bloods error:', error);
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
      
      // Count completed questions and first bloods
      let totalCompleted = 0;
      let totalFirstBloods = 0;
      
      if (team.scores?.psScores) {
        Object.values(team.scores.psScores).forEach(ps => {
          if (ps.questions) {
            Object.values(ps.questions).forEach(q => {
              if (q.isCompleted) totalCompleted++;
              if (q.isFirstBlood) totalFirstBloods++;
            });
          }
        });
      }
      
      scoreboard.push({
        teamId: docSnap.id,
        teamName: team.teamName,
        username: team.username,
        teamMembers: team.teamMembers,
        totalScore: team.scores?.totalScore || 0,
        completedQuestions: totalCompleted,
        firstBloods: totalFirstBloods
      });
    });

    // Sort by total score descending
    scoreboard.sort((a, b) => b.totalScore - a.totalScore);

    res.json(scoreboard);
  } catch (error) {
    console.error('Scoreboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get score timeline for chart
router.get('/score-timeline', async (req, res) => {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('role', '==', 'user'));
    const teamsSnapshot = await getDocs(q);
    
    const teamsTimeline = [];
    
    teamsSnapshot.forEach(docSnap => {
      const team = docSnap.data();
      const scoreHistory = [];
      
      // Collect all score events with timestamps
      if (team.scores?.psScores) {
        Object.entries(team.scores.psScores).forEach(([psNum, ps]) => {
          if (ps.questions) {
            Object.entries(ps.questions).forEach(([qNum, q]) => {
              if (q.isCompleted && q.completedAt) {
                scoreHistory.push({
                  timestamp: q.completedAt,
                  score: q.score || 0,
                  psNumber: parseInt(psNum),
                  questionIndex: parseInt(qNum)
                });
              }
            });
          }
        });
      }
      
      // Sort by timestamp
      scoreHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Calculate cumulative scores
      let cumulativeScore = 0;
      const timeline = scoreHistory.map(event => {
        cumulativeScore += event.score;
        return {
          timestamp: event.timestamp,
          score: cumulativeScore,
          psNumber: event.psNumber,
          questionIndex: event.questionIndex
        };
      });
      
      // Add starting point at 0
      if (timeline.length > 0) {
        timeline.unshift({
          timestamp: new Date(new Date(timeline[0].timestamp).getTime() - 1000).toISOString(),
          score: 0
        });
      }
      
      teamsTimeline.push({
        teamId: docSnap.id,
        teamName: team.teamName,
        timeline
      });
    });
    
    // Sort teams by final score descending
    teamsTimeline.sort((a, b) => {
      const aFinal = a.timeline.length > 0 ? a.timeline[a.timeline.length - 1].score : 0;
      const bFinal = b.timeline.length > 0 ? b.timeline[b.timeline.length - 1].score : 0;
      return bFinal - aFinal;
    });
    
    res.json(teamsTimeline);
  } catch (error) {
    console.error('Score timeline error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get problem statements (for admin reference)
router.get('/problemstatements', async (req, res) => {
  try {
    const psRef = collection(db, 'problemStatements');
    const snapshot = await getDocs(psRef);
    
    const problemStatements = snapshot.docs
      .map(doc => doc.data())
      .sort((a, b) => a.psNumber - b.psNumber);
    
    res.json(problemStatements);
  } catch (error) {
    console.error('PS fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get settings
router.get('/settings', async (req, res) => {
  try {
    const settingsRef = doc(db, 'settings', 'global');
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      // Return default settings if not exists
      return res.json({ showResultsToUsers: false, allowPSAccess: false });
    }
    
    const data = settingsDoc.data();
    res.json({
      showResultsToUsers: data.showResultsToUsers || false,
      allowPSAccess: data.allowPSAccess || false
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update settings
router.put('/settings', async (req, res) => {
  try {
    const { showResultsToUsers, allowPSAccess } = req.body;
    
    const settingsRef = doc(db, 'settings', 'global');
    const updateData = {};
    
    if (showResultsToUsers !== undefined) {
      updateData.showResultsToUsers = showResultsToUsers;
    }
    if (allowPSAccess !== undefined) {
      updateData.allowPSAccess = allowPSAccess;
    }
    
    await setDoc(settingsRef, updateData, { merge: true });
    
    res.json({ message: 'Settings updated successfully', ...updateData });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
