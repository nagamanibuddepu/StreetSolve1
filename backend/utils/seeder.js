/**
 * Database Seeder – Seeds demo data for development
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Issue = require('../models/Issue');
const { GovernmentBody } = require('../models/index');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await Promise.all([User.deleteMany(), Issue.deleteMany(), GovernmentBody.deleteMany()]);

  // Create gov bodies
  const municipal = await GovernmentBody.create({
    name: 'Greater Hyderabad Municipal Corporation',
    type: 'municipal',
    code: 'GHMC001',
    location: { type: 'Point', coordinates: [78.4867, 17.3850], address: 'Hyderabad', city: 'Hyderabad', state: 'Telangana', coverageRadius: 30000 },
    departments: [
      { name: 'Roads Department', head: 'Commissioner Roads', email: 'roads@ghmc.gov.in' },
      { name: 'Sanitation Department', head: 'Commissioner Sanitation', email: 'sanitation@ghmc.gov.in' },
      { name: 'Water Department', head: 'Commissioner Water', email: 'water@ghmc.gov.in' },
      { name: 'Electricity Department', head: 'Commissioner Electricity', email: 'electricity@ghmc.gov.in' },
    ],
    isVerified: true,
    isActive: true,
  });

  // Create users
  const [admin, citizen1, citizen2, volunteer1] = await User.create([
    { name: 'Admin User', email: 'admin@streetsolve.in', password: 'Admin@123', role: 'admin', isVerified: true, location: { type: 'Point', coordinates: [78.4867, 17.3850] } },
    { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210', password: 'Test@1234', role: 'citizen', isVerified: true, language: 'te', location: { type: 'Point', coordinates: [78.490, 17.391], address: 'Ameerpet, Hyderabad', city: 'Hyderabad', state: 'Telangana' }, nearbyMunicipalCorp: municipal._id },
    { name: 'Ravi Kumar', email: 'ravi@example.com', phone: '9876543211', password: 'Test@1234', role: 'citizen', isVerified: true, location: { type: 'Point', coordinates: [78.480, 17.375], city: 'Hyderabad', state: 'Telangana' }, nearbyMunicipalCorp: municipal._id },
    { name: 'Green Earth NGO', email: 'ngo@greenearth.org', phone: '9876543212', password: 'Test@1234', role: 'ngo', isVerified: true, organization: { name: 'Green Earth NGO', verified: true }, location: { type: 'Point', coordinates: [78.485, 17.388], city: 'Hyderabad' }, nearbyMunicipalCorp: municipal._id },
  ]);

  // Create sample issues
  await Issue.create([
    { title: 'Large pothole near MG Road bus stop', description: 'There is a dangerous pothole causing accidents. Two wheelers have fallen multiple times this week.', category: 'Roads', department: 'Roads Department', status: 'inprogress', location: { type: 'Point', coordinates: [78.487, 17.385], address: 'MG Road, Hyderabad', city: 'Hyderabad', state: 'Telangana' }, reportedBy: citizen1._id, assignedVolunteer: volunteer1._id, routedTo: municipal._id, voteCount: 24, priority: 'high', inputMethod: 'voice', statusHistory: [{ status: 'reported', changedBy: citizen1._id, changedByRole: 'citizen' }, { status: 'inprogress', changedBy: volunteer1._id, changedByRole: 'ngo' }] },
    { title: 'Garbage not collected for 5 days', description: 'Garbage collection truck has not come for 5 days. Overflow causing smell and mosquito breeding.', category: 'Sanitation', department: 'Sanitation Department', status: 'reported', location: { type: 'Point', coordinates: [78.480, 17.390], address: 'Ameerpet, Hyderabad', city: 'Hyderabad', state: 'Telangana' }, reportedBy: citizen2._id, routedTo: municipal._id, voteCount: 31, priority: 'high', statusHistory: [{ status: 'reported', changedBy: citizen2._id, changedByRole: 'citizen' }] },
    { title: 'Street light not working near school', description: 'Street light near the school has not been working for 2 weeks. Children and women feel unsafe at night.', category: 'Electricity', department: 'Electricity Department', status: 'completed', location: { type: 'Point', coordinates: [78.495, 17.375], address: 'Jubilee Hills, Hyderabad', city: 'Hyderabad', state: 'Telangana' }, reportedBy: citizen1._id, routedTo: municipal._id, voteCount: 18, satisfactionScore: 87, feedback: { yes: 7, no: 1, total: 8, notified: true, deadlineAt: new Date(Date.now() + 86400000 * 2) }, statusHistory: [{ status: 'reported', changedBy: citizen1._id, changedByRole: 'citizen' }, { status: 'completed', changedBy: volunteer1._id, changedByRole: 'ngo' }] },
    { title: 'Water pipe leaking on main road', description: 'Water is leaking from the main pipeline wasting thousands of liters daily. Road is also getting damaged.', category: 'Water', department: 'Water Department', status: 'accepted', location: { type: 'Point', coordinates: [78.470, 17.395], address: 'Begumpet, Hyderabad', city: 'Hyderabad', state: 'Telangana' }, reportedBy: citizen2._id, routedTo: municipal._id, voteCount: 42, priority: 'critical', statusHistory: [{ status: 'reported', changedBy: citizen2._id, changedByRole: 'citizen' }, { status: 'accepted', changedBy: admin._id, changedByRole: 'government' }] },
  ]);

  console.log('✅ Seed data created successfully!');
  console.log('Demo credentials:');
  console.log('  Admin: admin@streetsolve.in / Admin@123');
  console.log('  Citizen: priya@example.com / Test@1234');
  console.log('  NGO: ngo@greenearth.org / Test@1234');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
