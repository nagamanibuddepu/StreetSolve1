/**
 * Database Seeder — Seeds demo data for development/testing
 * Run: cd backend && npm run seed
 */
const path = require('path');

// Try multiple .env locations to handle different run contexts
const envPaths = [
  path.join(__dirname, '../../.env'),           // from backend/src/utils -> backend/.env
  path.join(__dirname, '../../../backend/.env'), // from project root
  path.join(process.cwd(), '.env'),             // current working directory
  path.join(process.cwd(), 'backend/.env'),     // if run from project root
];

let envLoaded = false;
for (const p of envPaths) {
  const result = require('dotenv').config({ path: p });
  if (!result.error && process.env.MONGODB_URI) {
    console.log(`✅ Loaded .env from: ${p}`);
    envLoaded = true;
    break;
  }
}

if (!process.env.MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI not found in any .env location.');
  console.error('Tried:', envPaths.join('\n  '));
  console.error('\nCreate backend/.env with: MONGODB_URI=your_connection_string');
  process.exit(1);
}

const mongoose = require('mongoose');
const User = require('../models/User');
const Issue = require('../models/Issue');
const { GovernmentBody } = require('../models/index');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Issue.deleteMany({}),
      GovernmentBody.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create government body
    const municipal = await GovernmentBody.create({
      name: 'Greater Hyderabad Municipal Corporation',
      type: 'municipal',
      code: 'GHMC001',
      location: {
        type: 'Point',
        coordinates: [78.4867, 17.3850],
        address: 'Tank Bund Road, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        coverageRadius: 30000,
      },
      departments: [
        { name: 'Roads Department',       head: 'Commissioner Roads',       email: 'roads@ghmc.gov.in',       isActive: true },
        { name: 'Sanitation Department',  head: 'Commissioner Sanitation',  email: 'sanitation@ghmc.gov.in',  isActive: true },
        { name: 'Water Department',       head: 'Commissioner Water',       email: 'water@ghmc.gov.in',       isActive: true },
        { name: 'Electricity Department', head: 'Commissioner Electricity', email: 'electricity@ghmc.gov.in', isActive: true },
      ],
      contact: { email: 'info@ghmc.gov.in', phone: '040-21111111', website: 'www.ghmc.gov.in' },
      isVerified: true,
      isActive: true,
    });

    // Create users
    const users = await User.create([
      {
        name: 'Admin StreetSolve',
        email: 'admin@streetsolve.in',
        password: 'Admin@123',
        role: 'admin',
        isVerified: true,
        location: { type: 'Point', coordinates: [78.4867, 17.3850], city: 'Hyderabad', state: 'Telangana' },
      },
      {
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '9876543210',
        password: 'Test@1234',
        role: 'citizen',
        isVerified: true,
        language: 'en',
        location: { type: 'Point', coordinates: [78.4900, 17.3910], address: 'Ameerpet', city: 'Hyderabad', state: 'Telangana', pincode: '500016' },
        nearbyMunicipalCorp: municipal._id,
      },
      {
        name: 'Ravi Kumar',
        email: 'ravi@example.com',
        phone: '9876543211',
        password: 'Test@1234',
        role: 'citizen',
        isVerified: true,
        location: { type: 'Point', coordinates: [78.4800, 17.3750], city: 'Hyderabad', state: 'Telangana' },
        nearbyMunicipalCorp: municipal._id,
      },
      {
        name: 'Green Earth NGO',
        email: 'ngo@greenearth.org',
        phone: '9876543212',
        password: 'Test@1234',
        role: 'ngo',
        isVerified: true,
        volunteerVerified: true,
        aadhaarVerified: true,
        organization: { name: 'Green Earth NGO', verified: true },
        location: { type: 'Point', coordinates: [78.4850, 17.3880], city: 'Hyderabad', state: 'Telangana' },
        nearbyMunicipalCorp: municipal._id,
      },
      {
        name: 'GHMC Official',
        email: 'ghmc@gov.in',
        phone: '9876543213',
        password: 'Govt@1234',
        role: 'government',
        isVerified: true,
        location: { type: 'Point', coordinates: [78.4867, 17.3850], city: 'Hyderabad', state: 'Telangana' },
        nearbyMunicipalCorp: municipal._id,
      },
    ]);

    const [admin, citizen1, citizen2, ngo, govt] = users;

    // Create sample issues
    await Issue.create([
      {
        title: 'Large pothole near Gandi Maisamma junction',
        description: 'There is a dangerous pothole causing accidents near the flyover. Multiple vehicles have been damaged. Immediate repair needed.',
        descriptionTranslated: 'There is a dangerous pothole causing accidents near the flyover.',
        category: 'Roads',
        department: 'Roads Department',
        status: 'inprogress',
        inputMethod: 'voice',
        language: 'en',
        location: {
          type: 'Point',
          coordinates: [78.4234, 17.5406],
          address: 'Bachupally Flyover',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500043',
          formattedAddress: 'Bachupally Flyover, Gandimaisamma, Dundigal, Hyderabad, 500043',
        },
        reportedBy: citizen1._id,
        assignedVolunteer: ngo._id,
        routedTo: municipal._id,
        voteCount: 24,
        priority: 'high',
        feedback: { yes: 8, no: 2, total: 10, notified: true },
        satisfactionScore: 80,
        statusHistory: [
          { status: 'reported',    changedBy: citizen1._id, changedByRole: 'citizen',  note: 'Issue reported via voice' },
          { status: 'accepted',    changedBy: govt._id,     changedByRole: 'government', note: 'Accepted by GHMC' },
          { status: 'inprogress',  changedBy: ngo._id,      changedByRole: 'ngo',       note: 'Green Earth NGO working on repair' },
        ],
      },
      {
        title: 'Garbage not collected for 5 days in Ameerpet',
        description: 'The garbage collection truck has not come for 5 days. Overflowing waste is causing health hazards and mosquito breeding.',
        category: 'Sanitation',
        department: 'Sanitation Department',
        status: 'reported',
        inputMethod: 'text',
        language: 'en',
        location: {
          type: 'Point',
          coordinates: [78.4483, 17.4340],
          address: 'Ameerpet Main Road',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500016',
          formattedAddress: 'Ameerpet Main Road, Ameerpet, Hyderabad, 500016',
        },
        reportedBy: citizen2._id,
        routedTo: municipal._id,
        voteCount: 31,
        priority: 'high',
        statusHistory: [{ status: 'reported', changedBy: citizen2._id, changedByRole: 'citizen', note: 'Issue reported' }],
      },
      {
        title: 'Street light not working near school for 2 weeks',
        description: 'The street light near MLR International School has been broken for 2 weeks. Children and women feel unsafe at night.',
        category: 'Electricity',
        department: 'Electricity Department',
        status: 'completed',
        inputMethod: 'text',
        language: 'en',
        location: {
          type: 'Point',
          coordinates: [78.4156, 17.5380],
          address: 'Near MLR International School',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500043',
          formattedAddress: 'Near MLR International School, Dundigal, Hyderabad, 500043',
        },
        reportedBy: citizen1._id,
        resolvedBy: ngo._id,
        resolvedAt: new Date(),
        routedTo: municipal._id,
        voteCount: 18,
        satisfactionScore: 87,
        feedback: { yes: 7, no: 1, total: 8, notified: true, deadlineAt: new Date(Date.now() + 2 * 86400000) },
        statusHistory: [
          { status: 'reported',   changedBy: citizen1._id, changedByRole: 'citizen' },
          { status: 'accepted',   changedBy: govt._id, changedByRole: 'government' },
          { status: 'inprogress', changedBy: ngo._id, changedByRole: 'ngo' },
          { status: 'completed',  changedBy: ngo._id, changedByRole: 'ngo', note: 'Light replaced and tested' },
        ],
      },
      {
        title: 'Water pipe leaking on Jubilee Hills main road',
        description: 'A major water pipeline is leaking near Road No. 36. Thousands of liters wasted daily and road is getting damaged.',
        category: 'Water',
        department: 'Water Department',
        status: 'accepted',
        inputMethod: 'photo',
        language: 'en',
        location: {
          type: 'Point',
          coordinates: [78.4022, 17.4286],
          address: 'Road No. 36, Jubilee Hills',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500033',
          formattedAddress: 'Road No. 36, Jubilee Hills, Hyderabad, 500033',
        },
        reportedBy: citizen2._id,
        routedTo: municipal._id,
        voteCount: 42,
        priority: 'critical',
        statusHistory: [
          { status: 'reported', changedBy: citizen2._id, changedByRole: 'citizen' },
          { status: 'accepted', changedBy: govt._id, changedByRole: 'government', note: 'Water board notified' },
        ],
      },
    ]);

    console.log('\n✅ Seed data created successfully!\n');
    console.log('Demo login credentials:');
    console.log('  Citizen:    priya@example.com   / Test@1234');
    console.log('  Citizen 2:  ravi@example.com    / Test@1234');
    console.log('  NGO:        ngo@greenearth.org  / Test@1234');
    console.log('  Government: ghmc@gov.in         / Govt@1234');
    console.log('  Admin:      admin@streetsolve.in / Admin@123\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    if (err.message.includes('authentication failed')) {
      console.error('   → Wrong MongoDB username or password in .env');
    }
    if (err.message.includes('ENOTFOUND')) {
      console.error('   → Cannot reach MongoDB. Check your connection string.');
    }
    process.exit(1);
  }
};

seed();
