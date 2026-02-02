const { db } = require('./config/firebase');
const { collection, doc, setDoc, getDocs, deleteDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

/**
 * Push Problem Statements JSON to Firebase
 * 
 * This script reads the problemStatements.json file from the data folder
 * and pushes all problem statements to Firebase Firestore.
 * It clears existing problem statements and first bloods before inserting new data.
 * 
 * Usage: node pushToFirebase.js
 */

const JSON_FILE = path.join(__dirname, 'data', 'problemStatements.json');

async function pushToFirebase() {
  try {
    console.log('🚀 Starting Firebase push...\n');

    // Read JSON file
    if (!fs.existsSync(JSON_FILE)) {
      console.error(`❌ JSON file not found: ${JSON_FILE}`);
      console.log('\nPlease run data/excelToJson.js first to generate the JSON file.');
      process.exit(1);
    }

    const jsonData = fs.readFileSync(JSON_FILE, 'utf8');
    const problemStatements = JSON.parse(jsonData);
    
    console.log(`📄 Loaded ${problemStatements.length} problem statements from JSON\n`);

    // Clear existing problem statements
    console.log('🗑️  Clearing existing problem statements...');
    const psRef = collection(db, 'problemStatements');
    const psSnapshot = await getDocs(psRef);
    for (const docSnap of psSnapshot.docs) {
      await deleteDoc(doc(db, 'problemStatements', docSnap.id));
    }
    console.log(`   Deleted ${psSnapshot.docs.length} existing problem statements`);

    // Clear existing firstBloods
    console.log('🗑️  Clearing existing first bloods...');
    const fbRef = collection(db, 'firstBloods');
    const fbSnapshot = await getDocs(fbRef);
    for (const docSnap of fbSnapshot.docs) {
      await deleteDoc(doc(db, 'firstBloods', docSnap.id));
    }
    console.log(`   Deleted ${fbSnapshot.docs.length} existing first blood records`);

    // Seed problem statements
    console.log('\n📝 Pushing problem statements...');
    for (const ps of problemStatements) {
      await setDoc(doc(db, 'problemStatements', `ps${ps.psNumber}`), ps);
      console.log(`   ✅ PS ${ps.psNumber}: ${ps.title} (${ps.severity})`);
    }

    // Initialize first bloods for each PS and question
    console.log('\n🏆 Initializing first blood tracking...');
    for (const ps of problemStatements) {
      const firstBloodData = {
        psNumber: ps.psNumber,
        questions: {}
      };
      
      // Initialize each question's first blood as null
      for (let i = 0; i < ps.questions.length; i++) {
        firstBloodData.questions[i] = {
          claimedBy: null,
          claimedAt: null
        };
      }
      
      await setDoc(doc(db, 'firstBloods', `ps${ps.psNumber}`), firstBloodData);
      console.log(`   ✅ First blood tracking for PS ${ps.psNumber} (${ps.questions.length} questions)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Firebase push completed successfully!');
    console.log('='.repeat(60));
    
    // Summary
    console.log('\nSummary:');
    console.log(`   - ${problemStatements.length} Problem Statements created`);
    
    let totalQuestions = 0;
    let caseSensitiveCount = 0;
    
    problemStatements.forEach(ps => {
      totalQuestions += ps.questions.length;
      caseSensitiveCount += ps.questions.filter(q => q.isCaseSensitive).length;
    });
    
    console.log(`   - ${totalQuestions} Total questions`);
    console.log(`   - ${caseSensitiveCount} Case-sensitive questions`);
    console.log(`   - ${totalQuestions - caseSensitiveCount} Case-insensitive questions`);
    console.log(`   - First blood tracking initialized for all questions`);
    
    console.log('\nProblem Statements:');
    problemStatements.forEach(ps => {
      console.log(`   PS${ps.psNumber}: ${ps.title} [${ps.severity.toUpperCase()}] - ${ps.questions.length} questions`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error pushing to Firebase:', error);
    process.exit(1);
  }
}

pushToFirebase();
