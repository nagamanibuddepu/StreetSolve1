/**
 * Database Seeder — 10 major Indian municipal corporations
 */
const path = require('path');
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../backend/.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env'),
];
for (const p of envPaths) {
  const result = require('dotenv').config({ path: p });
  if (!result.error && process.env.MONGODB_URI) { console.log(`✅ Loaded .env from: ${p}`); break; }
}
if (!process.env.MONGODB_URI) { console.error('❌ MONGODB_URI not found'); process.exit(1); }

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Issue = require('../models/Issue');
const { GovernmentBody } = require('../models/index');

const MUNICIPAL_CORPS = [
  { name:'Greater Hyderabad Municipal Corporation', code:'GHMC', city:'Hyderabad', state:'Telangana', coordinates:[78.4867,17.3850], pincode:'500001', email:'commissioner@ghmc.gov.in', phone:'040-21111111' },
  { name:'Bruhat Bengaluru Mahanagara Palike', code:'BBMP', city:'Bengaluru', state:'Karnataka', coordinates:[77.5946,12.9716], pincode:'560001', email:'commissioner@bbmp.gov.in', phone:'080-22221188' },
  { name:'Greater Chennai Corporation', code:'GCC', city:'Chennai', state:'Tamil Nadu', coordinates:[80.2707,13.0827], pincode:'600001', email:'commissioner@gcc.gov.in', phone:'044-25384927' },
  { name:'Brihanmumbai Municipal Corporation', code:'BMC', city:'Mumbai', state:'Maharashtra', coordinates:[72.8777,19.0760], pincode:'400001', email:'commissioner@mcgm.gov.in', phone:'022-22621111' },
  { name:'Delhi Municipal Corporation', code:'MCD', city:'Delhi', state:'Delhi', coordinates:[77.2090,28.6139], pincode:'110001', email:'commissioner@mcd.gov.in', phone:'011-23228550' },
  { name:'Kolkata Municipal Corporation', code:'KMC', city:'Kolkata', state:'West Bengal', coordinates:[88.3639,22.5726], pincode:'700001', email:'commissioner@kmcgov.in', phone:'033-22861000' },
  { name:'Pune Municipal Corporation', code:'PMC', city:'Pune', state:'Maharashtra', coordinates:[73.8567,18.5204], pincode:'411001', email:'commissioner@punecorporation.org', phone:'020-25501000' },
  { name:'Visakhapatnam Municipal Corporation', code:'GVMC', city:'Visakhapatnam', state:'Andhra Pradesh', coordinates:[83.2185,17.6868], pincode:'530001', email:'commissioner@gvmc.gov.in', phone:'0891-2564000' },
  { name:'Ahmedabad Municipal Corporation', code:'AMC', city:'Ahmedabad', state:'Gujarat', coordinates:[72.5714,23.0225], pincode:'380001', email:'commissioner@ahmedabadcity.gov.in', phone:'079-25391811' },
  { name:'Jaipur Municipal Corporation', code:'JMC', city:'Jaipur', state:'Rajasthan', coordinates:[75.7873,26.9124], pincode:'302001', email:'commissioner@jmcjaipur.org', phone:'0141-2743113' },
];

const DEPARTMENTS = [
  { name:'Roads Department', head:'Commissioner Roads', isActive:true },
  { name:'Sanitation Department', head:'Commissioner Sanitation', isActive:true },
  { name:'Water Department', head:'Commissioner Water', isActive:true },
  { name:'Electricity Department', head:'Commissioner Electricity', isActive:true },
  { name:'Parks Department', head:'Commissioner Parks', isActive:true },
  { name:'Drainage Department', head:'Commissioner Drainage', isActive:true },
  { name:'Noise & Environment Department', head:'Commissioner Environment', isActive:true },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    await Promise.all([User.deleteMany({}), Issue.deleteMany({}), GovernmentBody.deleteMany({})]);
    console.log('🗑️  Cleared existing data');

    // Create all 10 municipal corporations
    const govBodies = [];
    for (const corp of MUNICIPAL_CORPS) {
      const gb = await GovernmentBody.create({
        name: corp.name, type:'municipal', code: corp.code,
        location: { type:'Point', coordinates: corp.coordinates, address:`${corp.city} Headquarters`, city: corp.city, state: corp.state, coverageRadius:30000 },
        departments: DEPARTMENTS.map(d => ({ ...d, email: `${d.name.toLowerCase().replace(/ /g,'')}@${corp.code.toLowerCase()}.gov.in` })),
        contact: { email: corp.email, phone: corp.phone, website:`www.${corp.code.toLowerCase()}.gov.in` },
        isVerified:true, isActive:true,
      });
      govBodies.push(gb);
    }
    const ghmc = govBodies[0]; // Hyderabad
    console.log(`✅ Created ${govBodies.length} Municipal Corporations`);

    // Create users
    const [admin, priya, ravi, ngo, ghmc_user] = await User.create([
      { name:'Admin StreetSolve', email:'admin@streetsolve.in', password:'Admin@123', role:'admin', isVerified:true, location:{ type:'Point', coordinates:[78.4867,17.3850], city:'Hyderabad', state:'Telangana' } },
      { name:'Priya Sharma', email:'priya@example.com', phone:'9876543210', password:'Test@1234', role:'citizen', isVerified:true, language:'en', location:{ type:'Point', coordinates:[78.4900,17.3910], address:'Ameerpet', city:'Hyderabad', state:'Telangana', pincode:'500016' }, nearbyMunicipalCorp:ghmc._id, issuesReported:1, votesGiven:2 },
      { name:'Ravi Kumar', email:'ravi@example.com', phone:'9876543211', password:'Test@1234', role:'citizen', isVerified:true, location:{ type:'Point', coordinates:[78.4800,17.3750], city:'Hyderabad', state:'Telangana' }, nearbyMunicipalCorp:ghmc._id },
      { name:'Green Earth NGO', email:'ngo@greenearth.org', phone:'9876543212', password:'Test@1234', role:'ngo', isVerified:true, volunteerVerified:true, aadhaarVerified:true, organization:{ name:'Green Earth NGO', verified:true }, location:{ type:'Point', coordinates:[78.4850,17.3880], city:'Hyderabad', state:'Telangana' }, nearbyMunicipalCorp:ghmc._id },
      { name:'GHMC Official', email:'ghmc@gov.in', phone:'9876543213', password:'Govt@1234', role:'government', isVerified:true, location:{ type:'Point', coordinates:[78.4867,17.3850], city:'Hyderabad', state:'Telangana' }, nearbyMunicipalCorp:ghmc._id },
    ]);
    console.log('✅ Created 5 demo users');

    // Create sample issues across different cities
    await Issue.create([
      {
        title:'Large pothole near Gandi Maisamma junction', description:'Dangerous pothole causing accidents near the flyover. Multiple vehicles damaged.',
        category:'Roads', department:'Roads Department', status:'inprogress', inputMethod:'voice', reportLang:'en',
        location:{ type:'Point', coordinates:[78.4234,17.5406], address:'Bachupally Flyover', city:'Hyderabad', state:'Telangana', pincode:'500043', formattedAddress:'Bachupally Flyover, Gandimaisamma, Hyderabad, 500043' },
        reportedBy:priya._id, assignedVolunteer:ngo._id, routedTo:ghmc._id, voteCount:24, priority:'high',
        feedback:{ yes:8, no:2, total:10, notified:true }, satisfactionScore:80,
        statusHistory:[
          { status:'reported', changedBy:priya._id, changedByRole:'citizen', note:'Issue reported via voice' },
          { status:'accepted', changedBy:ghmc_user._id, changedByRole:'government', note:'Accepted by GHMC' },
          { status:'inprogress', changedBy:ngo._id, changedByRole:'ngo', note:'NGO working on repair' },
        ],
      },
      {
        title:'Garbage not collected for 5 days in Ameerpet', description:'Garbage collection truck not coming. Overflowing waste causing health hazards.',
        category:'Sanitation', department:'Sanitation Department', status:'reported', inputMethod:'text', reportLang:'en',
        location:{ type:'Point', coordinates:[78.4483,17.4340], address:'Ameerpet Main Road', city:'Hyderabad', state:'Telangana', pincode:'500016', formattedAddress:'Ameerpet Main Road, Ameerpet, Hyderabad, 500016' },
        reportedBy:ravi._id, routedTo:ghmc._id, voteCount:31, priority:'high',
        statusHistory:[{ status:'reported', changedBy:ravi._id, changedByRole:'citizen', note:'Issue reported' }],
      },
      {
        title:'Street light not working near school', description:'Street light near MLR International School broken for 2 weeks. Children feel unsafe at night.',
        category:'Electricity', department:'Electricity Department', status:'completed', inputMethod:'text', reportLang:'en',
        location:{ type:'Point', coordinates:[78.4156,17.5380], address:'Near MLR School', city:'Hyderabad', state:'Telangana', pincode:'500043', formattedAddress:'Near MLR International School, Dundigal, Hyderabad, 500043' },
        reportedBy:priya._id, resolvedBy:ngo._id, resolvedAt:new Date(), routedTo:ghmc._id, voteCount:18, satisfactionScore:87,
        feedback:{ yes:7, no:1, total:8, notified:true, deadlineAt:new Date(Date.now()+2*86400000) },
        statusHistory:[
          { status:'reported', changedBy:priya._id, changedByRole:'citizen' },
          { status:'accepted', changedBy:ghmc_user._id, changedByRole:'government' },
          { status:'inprogress', changedBy:ngo._id, changedByRole:'ngo' },
          { status:'completed', changedBy:ngo._id, changedByRole:'ngo', note:'Light replaced and tested' },
        ],
      },
      {
        title:'Water pipe leaking on main road', description:'Major water pipeline leaking near Road No. 36. Thousands of liters wasted daily.',
        category:'Water', department:'Water Department', status:'accepted', inputMethod:'photo', reportLang:'en',
        location:{ type:'Point', coordinates:[78.4022,17.4286], address:'Road No. 36, Jubilee Hills', city:'Hyderabad', state:'Telangana', pincode:'500033', formattedAddress:'Road No. 36, Jubilee Hills, Hyderabad, 500033' },
        reportedBy:ravi._id, routedTo:ghmc._id, voteCount:42, priority:'critical',
        statusHistory:[
          { status:'reported', changedBy:ravi._id, changedByRole:'citizen' },
          { status:'accepted', changedBy:ghmc_user._id, changedByRole:'government', note:'Water board notified' },
        ],
      },
    ]);
    console.log('✅ Created 4 sample issues');

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Municipal Corporations added:', MUNICIPAL_CORPS.map(c => `${c.name} (${c.city})`).join('\n  - '));
    console.log('\nDemo credentials:');
    console.log('  Citizen:    priya@example.com   / Test@1234');
    console.log('  NGO:        ngo@greenearth.org  / Test@1234');
    console.log('  Government: ghmc@gov.in         / Govt@1234');
    console.log('  Admin:      admin@streetsolve.in / Admin@123');
    process.exit(0);
  } catch(err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};
seed();
