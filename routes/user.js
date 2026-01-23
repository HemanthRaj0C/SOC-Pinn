const express = require('express');
const { db } = require('../config/firebase');
const { collection, doc, getDoc, updateDoc, query, where, getDocs } = require('firebase/firestore');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(roleMiddleware('user'));

// Get dashboard (assigned PS)
router.get('/dashboard', async (req, res) => {
  try {
    const teamDocRef = doc(db, 'teams', req.user.id);
    const teamDoc = await getDoc(teamDocRef);
    
    if (!teamDoc.exists()) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const team = teamDoc.data();

    res.json({
      teamName: team.teamName,
      assignedPS: team.assignedPS,
      submissions: team.submissions || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific problem statement
router.get('/ps/:number', async (req, res) => {
  try {
    const psNumber = parseInt(req.params.number);
    
    // Check if team is assigned this PS
    const teamDocRef = doc(db, 'teams', req.user.id);
    const teamDoc = await getDoc(teamDocRef);
    
    if (!teamDoc.exists()) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const team = teamDoc.data();
    
    if (!team.assignedPS.includes(psNumber)) {
      return res.status(403).json({ message: 'Not assigned to this problem statement' });
    }

    // Check if the PS has been started
    const submission = team.submissions?.find(s => s.psNumber === psNumber);
    
    if (!submission || !submission.hasStarted) {
      return res.status(403).json({ message: 'You must start this challenge from the dashboard first' });
    }

    // Check if the PS has already been completed
    if (submission.isCompleted) {
      return res.status(403).json({ message: 'You have already submitted this problem statement' });
    }

    // Get PS details
    const psRef = collection(db, 'problemStatements');
    const q = query(psRef, where('psNumber', '==', psNumber));
    const psSnapshot = await getDocs(q);

    if (psSnapshot.empty) {
      return res.status(404).json({ message: 'Problem statement not found' });
    }

    const ps = psSnapshot.docs[0].data();

    res.json({
      ...ps,
      submission: submission || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start challenge
router.post('/ps/:number/start', async (req, res) => {
  try {
    const psNumber = parseInt(req.params.number);
    const teamRef = doc(db, 'teams', req.user.id);
    const teamDoc = await getDoc(teamRef);
    
    if (!teamDoc.exists()) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const team = teamDoc.data();

    // Check if already started
    const existingSubmission = team.submissions?.find(s => s.psNumber === psNumber);
    if (existingSubmission?.hasStarted) {
      return res.status(400).json({ message: 'Challenge already started' });
    }

    const startTime = new Date().toISOString();

    // Update submissions
    const submissions = team.submissions || [];
    const submissionIndex = submissions.findIndex(s => s.psNumber === psNumber);

    if (submissionIndex >= 0) {
      submissions[submissionIndex] = {
        ...submissions[submissionIndex],
        hasStarted: true,
        startTime
      };
    } else {
      submissions.push({
        psNumber,
        hasStarted: true,
        startTime,
        isCompleted: false,
        completedTime: null,
        timeTaken: null,
        submissionContent: null
      });
    }

    await updateDoc(teamRef, { submissions });

    res.json({ message: 'Challenge started', startTime });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit challenge
router.post('/ps/:number/submit', async (req, res) => {
  try {
    const psNumber = parseInt(req.params.number);
    const { content } = req.body;
    const teamRef = doc(db, 'teams', req.user.id);
    const teamDoc = await getDoc(teamRef);
    
    if (!teamDoc.exists()) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    const team = teamDoc.data();

    const submission = team.submissions?.find(s => s.psNumber === psNumber);

    if (!submission?.hasStarted) {
      return res.status(400).json({ message: 'Challenge not started' });
    }

    if (submission.isCompleted) {
      return res.status(400).json({ message: 'Challenge already submitted' });
    }

    const completedTime = new Date().toISOString();
    const timeTaken = new Date(completedTime) - new Date(submission.startTime);

    // Update submission
    const submissions = team.submissions.map(s => {
      if (s.psNumber === psNumber) {
        return {
          ...s,
          isCompleted: true,
          completedTime,
          timeTaken,
          submissionContent: content
        };
      }
      return s;
    });

    await updateDoc(teamRef, { submissions });

    res.json({ message: 'Challenge submitted successfully', timeTaken });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
