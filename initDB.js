const bcrypt = require('bcryptjs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...\n');

  try {
    // Hash passwords
    const password1 = await bcrypt.hash('team1pass', 10);
    const password2 = await bcrypt.hash('team2pass', 10);
    const password3 = await bcrypt.hash('team3pass', 10);
    const adminPass = await bcrypt.hash('admin123', 10);

    console.log('✅ Passwords hashed');

    // Create Teams
    const teamsData = [
      {
        teamName: 'Team Alpha',
        username: 'team1',
        password: password1,
        role: 'user',
        teamMembers: ['John Doe', 'Jane Smith'],
        assignedPS: [1, 2],
        submissions: []
      },
      {
        teamName: 'Team Beta',
        username: 'team2',
        password: password2,
        role: 'user',
        teamMembers: ['Mike Johnson', 'Sarah Williams'],
        assignedPS: [2, 3],
        submissions: []
      },
      {
        teamName: 'Team Gamma',
        username: 'team3',
        password: password3,
        role: 'user',
        teamMembers: ['David Brown', 'Emily Davis'],
        assignedPS: [1, 3],
        submissions: []
      },
      {
        teamName: 'Admin',
        username: 'admin',
        password: adminPass,
        role: 'admin',
        teamMembers: [],
        assignedPS: [],
        submissions: []
      }
    ];

    console.log('📝 Creating teams...');
    for (const team of teamsData) {
      await addDoc(collection(db, 'teams'), team);
      console.log(`   ✓ Created ${team.teamName} (${team.username})`);
    }

    // Create Problem Statements
    const problemStatements = [
      {
        psNumber: 1,
        title: 'Ransomware Attack Analysis',
        description: `A critical ransomware attack has been detected in the organization's network. Multiple systems have been encrypted, and a ransom note has been left on affected machines.

Your task is to analyze the incident and provide a comprehensive incident response report.

Key Information:
- Initial Detection: 2026-01-23 08:30 AM
- Affected Systems: 15 workstations in Finance Department
- Ransom Amount: 5 BTC
- File Extension: .locked
- Suspicious Activity: Unusual network traffic to IP 192.168.45.120

Investigation Points:
1. Identify the attack vector (how did the ransomware enter?)
2. Timeline of the attack spread
3. Containment measures taken
4. Evidence collection procedures
5. Recommended remediation steps
6. Prevention strategies for future`,
        details: {
          severity: 'Critical',
          department: 'Finance',
          affectedAssets: 15,
          detectionTime: '2026-01-23T08:30:00Z'
        }
      },
      {
        psNumber: 2,
        title: 'Phishing Campaign Investigation',
        description: `Multiple employees have reported receiving suspicious emails claiming to be from the IT department. The emails contain a link requesting users to "verify their account credentials."

Your task is to investigate this phishing campaign and provide recommendations.

Key Information:
- Number of Reports: 47 employees
- Email Subject: "URGENT: Account Verification Required"
- Sender: it-support@company-verify.com (spoofed)
- Link Destination: http://secure-login-portal.xyz
- Clicked by: 12 employees
- Credentials Entered: 5 employees

Investigation Points:
1. Email header analysis
2. Malicious link analysis and payload identification
3. Impact assessment (compromised accounts)
4. Immediate containment actions
5. Employee communication strategy
6. Long-term security awareness recommendations`,
        details: {
          severity: 'High',
          affectedUsers: 47,
          compromisedAccounts: 5,
          campaignStart: '2026-01-22T14:00:00Z'
        }
      },
      {
        psNumber: 3,
        title: 'Insider Threat Detection',
        description: `Security monitoring systems have flagged unusual behavior from a privileged user account. The account has been accessing sensitive files outside normal working hours.

Your task is to analyze this potential insider threat.

Key Information:
- Account: john.admin@company.com
- Unusual Activity Period: 2026-01-20 to 2026-01-23
- Access Time: 2:00 AM - 4:00 AM
- Files Accessed: Customer database, Financial reports, Employee records
- Data Transferred: 2.5 GB to external USB drive
- Failed Login Attempts: 8 (unusual for this user)

Investigation Points:
1. User behavior analysis
2. Data access patterns and anomalies
3. Risk assessment
4. Evidence preservation
5. Recommended investigation steps
6. Policy recommendations to prevent future incidents`,
        details: {
          severity: 'Critical',
          userAccount: 'john.admin@company.com',
          dataExfiltration: '2.5 GB',
          timeframe: '2026-01-20 to 2026-01-23'
        }
      }
    ];

    console.log('\n📝 Creating problem statements...');
    for (const ps of problemStatements) {
      await addDoc(collection(db, 'problemStatements'), ps);
      console.log(`   ✓ Created PS ${ps.psNumber}: ${ps.title}`);
    }

    console.log('\n✨ Database initialization complete!\n');
    console.log('📌 Login Credentials:');
    console.log('   Admin:');
    console.log('      Username: admin');
    console.log('      Password: admin123\n');
    console.log('   Teams:');
    console.log('      Username: team1 | Password: team1pass | Assigned: PS 1');
    console.log('      Username: team2 | Password: team2pass | Assigned: PS 2');
    console.log('      Username: team3 | Password: team3pass | Assigned: PS 1');
    console.log('\n🎯 You can now login and test the application!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
