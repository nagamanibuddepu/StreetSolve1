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
  { name:'Greater Visakhapatnam Municipal Corporation', code:'GVMC', city:'Visakhapatnam', state:'Andhra Pradesh', coordinates:[83.2185,17.6868], pincode:'530001', email:'commissioner@gvmc.gov.in', phone:'0891-2564000' },
  { name:'Ahmedabad Municipal Corporation', code:'AMC', city:'Ahmedabad', state:'Gujarat', coordinates:[72.5714,23.0225], pincode:'380001', email:'commissioner@ahmedabadcity.gov.in', phone:'079-25391811' },
  { name:'Jaipur Municipal Corporation', code:'JMC', city:'Jaipur', state:'Rajasthan', coordinates:[75.7873,26.9124], pincode:'302001', email:'commissioner@jmcjaipur.org', phone:'0141-2743113' },
];

const GRAM_PANCHAYATS = [
  { name:'Dundigal Municipality', code:'DGP', city:'Dundigal', state:'Telangana', coordinates:[78.4316, 17.5857], pincode:'500043', email:'admin@dundigalmunicipality.in', phone:'040-23456781' },
  { name:'Gandi Maisamma Gram Panchayat', code:'GMGP', city:'Hyderabad', state:'Telangana', coordinates:[78.4300, 17.5606], pincode:'500043', email:'gandimaisamma@panchayat.in', phone:'040-23456782' },
  { name:'Anakapalle Municipality', code:'AKP', city:'Anakapalle', state:'Andhra Pradesh', coordinates:[83.0033, 17.6913], pincode:'531001', email:'anakapalle@muncipality.in', phone:'08922-223445' },
  { name:'Bheemunipatnam Municipality', code:'BMP', city:'Bheemili', state:'Andhra Pradesh', coordinates:[83.4563, 17.8920], pincode:'531163', email:'bheemili@muncipality.in', phone:'08933-231122' },
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

    // Create all municipal corporations and gram panchayats
    const govBodies = [];
    
    for (const corp of MUNICIPAL_CORPS) {
      const gb = await GovernmentBody.create({
        name: corp.name, type:'municipal', code: corp.code,
        location: { type:'Point', coordinates: corp.coordinates, address:`${corp.city} Headquarters`, city: corp.city, state: corp.state, coverageRadius:40000 },
        departments: DEPARTMENTS.map(d => ({ ...d, email: `${d.name.toLowerCase().replace(/ /g,'')}@${corp.code.toLowerCase()}.gov.in` })),
        contact: { email: corp.email, phone: corp.phone, website:`www.${corp.code.toLowerCase()}.gov.in` },
        isVerified:true, isActive:true,
      });
      govBodies.push(gb);
    }
    
    for (const gp of GRAM_PANCHAYATS) {
      const gbp = await GovernmentBody.create({
        name: gp.name, type:'grampanchayat', code: gp.code,
        location: { type:'Point', coordinates: gp.coordinates, address:`${gp.city} Office`, city: gp.city, state: gp.state, coverageRadius:8000 },
        departments: DEPARTMENTS.map(d => ({ ...d, email: `${d.name.toLowerCase().replace(/ /g,'')}@${gp.code.toLowerCase()}.gov.in` })),
        contact: { email: gp.email, phone: gp.phone, website:`www.${gp.code.toLowerCase()}.gov.in` },
        isVerified:true, isActive:true,
      });
      govBodies.push(gbp);
    }

    const ghmc = govBodies.find(b => b.code === 'GHMC'); // Hyderabad
    console.log(`✅ Created ${govBodies.length} Authorized Governance Bodies (Municipal & Panchayat)`);

    // Create basic users
    const [admin, priya, ravi, ngo] = await User.create([
      { name:'Admin StreetSolve', email:'admin@streetsolve.in', password:'Admin@123', role:'admin', isVerified:true, location:{ type:'Point', coordinates:[78.4867,17.3850], city:'Hyderabad', state:'Telangana' } },
      { name:'Priya Sharma', email:'priya@example.com', phone:'9876543210', password:'Test@1234', role:'citizen', isVerified:true, language:'en', location:{ type:'Point', coordinates:[78.4900,17.3910], address:'Ameerpet', city:'Hyderabad', state:'Telangana', pincode:'500016' }, nearbyMunicipalCorp:ghmc._id, issuesReported:1, votesGiven:2 },
      { name:'Ravi Kumar', email:'ravi@example.com', phone:'9876543211', password:'Test@1234', role:'citizen', isVerified:true, location:{ type:'Point', coordinates:[78.4800,17.3750], city:'Hyderabad', state:'Telangana' }, nearbyMunicipalCorp:ghmc._id },
      { name:'Green Earth NGO', email:'ngo@greenearth.org', phone:'9876543212', password:'Test@1234', role:'ngo', isVerified:true, volunteerVerified:true, aadhaarVerified:true, organization:{ name:'Green Earth NGO', verified:true }, location:{ type:'Point', coordinates:[78.4850,17.3880], city:'Hyderabad', state:'Telangana' }, nearbyMunicipalCorp:ghmc._id },
    ]);
    
    // Create gov users dynamically mapped to the bodies
    const govUsersData = govBodies.map((b, i) => ({
      name:`${b.code} Official`, 
      email:`admin@${b.code.toLowerCase()}.gov.in`, 
      phone:`98765431${i.toString().padStart(2, '0')}`, 
      password:'Govt@1234', 
      role:'government', 
      isVerified:true, 
      location: b.location, 
      nearbyMunicipalCorp: b._id 
    }));
    const govUsers = await User.create(govUsersData);
    const ghmc_user = govUsers.find(u => u.email === 'admin@ghmc.gov.in');
    
    console.log(`✅ Created ${govUsers.length} dynamic government users and 4 demo users`);

    // Find specific governance bodies for accurate routing
    const gvmc = govBodies.find(b => b.code === 'GVMC');
    const bbmp = govBodies.find(b => b.code === 'BBMP');
    const mcd = govBodies.find(b => b.code === 'MCD');
    const dgp = govBodies.find(b => b.code === 'DGP');

    // Create 15 sample issues across different cities
    await Issue.create([
      // HYDERABAD (GHMC)
      {
        title:'Large pothole near Gandi Maisamma junction', description:'Dangerous pothole causing accidents near the flyover. Multiple vehicles damaged.',
        category:'Roads', department:'Roads Department', status:'inprogress', inputMethod:'voice', reportLang:'en',
        location:{ type:'Point', coordinates:[78.4234,17.5406], address:'Bachupally Flyover', city:'Hyderabad', state:'Telangana', pincode:'500043', formattedAddress:'Bachupally Flyover, Gandimaisamma, Hyderabad, 500043' },
        reportedBy:priya._id, assignedVolunteer:ngo._id, routedTo:ghmc._id, voteCount:24, priority:'high',
        satisfactionScore:80, statusHistory:[{ status:'reported', changedBy:priya._id, changedByRole:'citizen' }, { status:'accepted', changedBy:ghmc_user._id, changedByRole:'government' }, { status:'inprogress', changedBy:ngo._id, changedByRole:'ngo' }],
      },
      {
        title:'Garbage not collected for 5 days in Ameerpet', description:'Garbage collection truck not coming. Overflowing waste causing health hazards.',
        category:'Sanitation', department:'Sanitation Department', status:'reported', inputMethod:'text', reportLang:'en',
        location:{ type:'Point', coordinates:[78.4483,17.4340], address:'Ameerpet Main Road', city:'Hyderabad', state:'Telangana', pincode:'500016', formattedAddress:'Ameerpet Main Road, Ameerpet, Hyderabad, 500016' },
        reportedBy:ravi._id, routedTo:ghmc._id, voteCount:31, priority:'high', statusHistory:[{ status:'reported', changedBy:ravi._id, changedByRole:'citizen' }],
      },
      {
        title:'Street light not working near school', description:'Street light near MLR International School broken for 2 weeks. Children feel unsafe at night.',
        category:'Electricity', department:'Electricity Department', status:'completed', inputMethod:'text', reportLang:'en',
        location:{ type:'Point', coordinates:[78.4156,17.5380], address:'Near MLR School', city:'Hyderabad', state:'Telangana', pincode:'500043', formattedAddress:'Near MLR International School, Dundigal, Hyderabad, 500043' },
        reportedBy:priya._id, resolvedBy:ngo._id, resolvedAt:new Date(), routedTo:ghmc._id, voteCount:18, satisfactionScore:87,
        statusHistory:[{ status:'reported', changedBy:priya._id, changedByRole:'citizen' }, { status:'accepted', changedBy:ghmc_user._id, changedByRole:'government' }, { status:'completed', changedBy:ngo._id, changedByRole:'ngo' }],
      },
      {
        title:'Water pipe leaking on main road', description:'Major water pipeline leaking near Road No. 36. Thousands of liters wasted daily.',
        category:'Water', department:'Water Department', status:'accepted', inputMethod:'photo', reportLang:'en',
        location:{ type:'Point', coordinates:[78.4022,17.4286], address:'Road No. 36, Jubilee Hills', city:'Hyderabad', state:'Telangana', pincode:'500033', formattedAddress:'Road No. 36, Jubilee Hills, Hyderabad, 500033' },
        reportedBy:ravi._id, routedTo:ghmc._id, voteCount:42, priority:'critical', statusHistory:[{ status:'reported', changedBy:ravi._id, changedByRole:'citizen' }, { status:'accepted', changedBy:ghmc_user._id, changedByRole:'government' }],
      },
      {
        title:'Open manhole cover near Metro Station', description:'Manhole cover is missing near Secunderabad East Metro. Serious risk for pedestrians.',
        category:'Drainage', department:'Drainage Department', status:'reported', inputMethod:'voice', reportLang:'te',
        location:{ type:'Point', coordinates:[78.5020,17.4330], address:'Secunderabad East', city:'Hyderabad', state:'Telangana', pincode:'500003', formattedAddress:'Secunderabad East Metro, Hyderabad' },
        reportedBy:ravi._id, routedTo:ghmc._id, voteCount:12, priority:'critical', statusHistory:[{ status:'reported', changedBy:ravi._id, changedByRole:'citizen' }],
      },

      // DUNDIGAL PANCHAYAT
      {
        title:'Stray dog menace near residential area', description:'Pack of aggressive stray dogs chasing vehicles and children in Dundigal.',
        category:'Others', department:'General', status:'accepted', inputMethod:'text', reportLang:'en',
        location:{ type:'Point', coordinates:[78.4320,17.5860], address:'Dundigal Village', city:'Dundigal', state:'Telangana', pincode:'500043', formattedAddress:'Dundigal Village, Medchal-Malkajgiri' },
        reportedBy:priya._id, routedTo:dgp._id, voteCount:9, priority:'medium', statusHistory:[{ status:'reported', changedBy:priya._id, changedByRole:'citizen' }, { status:'accepted', changedBy:admin._id, changedByRole:'government' }],
      },

      // VISAKHAPATNAM (GVMC)
      {
        title:'Beach road streetlights flickering', description:'Multiple streetlights on RK Beach Road are flickering or dead.',
        category:'Electricity', department:'Electricity Department', status:'reported', inputMethod:'text', reportLang:'en',
        location:{ type:'Point', coordinates:[83.3245,17.7135], address:'RK Beach Road', city:'Visakhapatnam', state:'Andhra Pradesh', pincode:'530002', formattedAddress:'Ramakrishna Beach, Visakhapatnam' },
        reportedBy:ravi._id, routedTo:gvmc._id, voteCount:38, priority:'medium', statusHistory:[{ status:'reported', changedBy:ravi._id, changedByRole:'citizen' }],
      },
      {
        title:'Blocked stormwater drain near MVP Colony', description:'Drainage completely blocked with plastic waste causing stagnation.',
        category:'Drainage', department:'Drainage Department', status:'inprogress', inputMethod:'photo', reportLang:'en',
        location:{ type:'Point', coordinates:[83.3323,17.7270], address:'MVP Colony', city:'Visakhapatnam', state:'Andhra Pradesh', pincode:'530017', formattedAddress:'MVP Colony, Sector 1, Visakhapatnam' },
        reportedBy:priya._id, routedTo:gvmc._id, voteCount:15, priority:'high', statusHistory:[{ status:'reported', changedBy:priya._id, changedByRole:'citizen' }, { status:'accepted', changedBy:admin._id, changedByRole:'government' }, { status:'inprogress', changedBy:ngo._id, changedByRole:'ngo' }],
      },
      {
        title:'Excessive noise pollution from late-night club', description:'Club continuously playing loud music past 2 AM. Police not responding.',
        category:'Noise', department:'Noise & Environment Department', status:'completed', inputMethod:'voice', reportLang:'te',
        location:{ type:'Point', coordinates:[83.3150,17.7200], address:'Siripuram Junction', city:'Visakhapatnam', state:'Andhra Pradesh', pincode:'530003', formattedAddress:'Siripuram, Visakhapatnam' },
        reportedBy:ravi._id, routedTo:gvmc._id, voteCount:54, priority:'medium', satisfactionScore: 92, statusHistory:[{ status:'reported', changedBy:ravi._id, changedByRole:'citizen' }, { status:'completed', changedBy:admin._id, changedByRole:'government' }],
      },

      // BENGALURU (BBMP)
      {
        title:'Pothole ridden road in Koramangala', description:'Road surface completely eroded in 80 feet road. Heavy traffic slowdowns.',
        category:'Roads', department:'Roads Department', status:'reported', inputMethod:'text', reportLang:'en',
        location:{ type:'Point', coordinates:[77.6250,12.9350], address:'80 Feet Road, Koramangala', city:'Bengaluru', state:'Karnataka', pincode:'560034', formattedAddress:'80 Feet Rd, Koramangala, Bengaluru' },
        reportedBy:priya._id, routedTo:bbmp._id, voteCount:87, priority:'critical', statusHistory:[{ status:'reported', changedBy:priya._id, changedByRole:'citizen' }],
      },
      {
        title:'Illegal tree felling in Indiranagar', description:'Contractors cutting down old banyan trees illegally at night.',
        category:'Parks', department:'Parks Department', status:'accepted', inputMethod:'photo', reportLang:'kn',
        location:{ type:'Point', coordinates:[77.6400,12.9780], address:'100 Feet Road, Indiranagar', city:'Bengaluru', state:'Karnataka', pincode:'560038', formattedAddress:'Indiranagar, Bengaluru' },
        reportedBy:ravi._id, routedTo:bbmp._id, voteCount:45, priority:'high', statusHistory:[{ status:'reported', changedBy:ravi._id, changedByRole:'citizen' }, { status:'accepted', changedBy:admin._id, changedByRole:'government' }],
      },
      {
        title:'Sewage water mixing with drinking water', description:'Foul smell and yellow water coming from taps. High threat of diseases.',
        category:'Water', department:'Water Department', status:'inprogress', inputMethod:'text', reportLang:'en',
        location:{ type:'Point', coordinates:[77.5800,12.9200], address:'Jayanagar 4th Block', city:'Bengaluru', state:'Karnataka', pincode:'560011', formattedAddress:'Jayanagar, Bengaluru' },
        reportedBy:priya._id, routedTo:bbmp._id, voteCount:112, priority:'critical', statusHistory:[{ status:'reported', changedBy:priya._id, changedByRole:'citizen' }, { status:'inprogress', changedBy:admin._id, changedByRole:'government' }],
      },

      // DELHI (MCD)
      {
        title:'Garbage burning causing severe smog', description:'Large pile of commercial waste being burned daily in an empty lot.',
        category:'Noise', department:'Noise & Environment Department', status:'reported', inputMethod:'photo', reportLang:'hi',
        location:{ type:'Point', coordinates:[77.2000,28.6200], address:'Connaught Place', city:'Delhi', state:'Delhi', pincode:'110001', formattedAddress:'Connaught Place, New Delhi' },
        reportedBy:ravi._id, routedTo:mcd._id, voteCount:76, priority:'critical', statusHistory:[{ status:'reported', changedBy:ravi._id, changedByRole:'citizen' }],
      },
      {
        title:'Broken park equipment', description:'Swings and slides in the children\'s park are rusted and broken.',
        category:'Parks', department:'Parks Department', status:'completed', inputMethod:'text', reportLang:'en',
        location:{ type:'Point', coordinates:[77.2150,28.6000], address:'India Gate Children Park', city:'Delhi', state:'Delhi', pincode:'110001', formattedAddress:'India Gate, New Delhi' },
        reportedBy:priya._id, routedTo:mcd._id, voteCount:22, priority:'low', satisfactionScore: 65, statusHistory:[{ status:'reported', changedBy:priya._id, changedByRole:'citizen' }, { status:'completed', changedBy:admin._id, changedByRole:'government' }],
      },
      {
        title:'Road caved in near Metro Pillar', description:'Massive sinkhole developing near metro pillar due to pipeline burst.',
        category:'Roads', department:'Roads Department', status:'inprogress', inputMethod:'voice', reportLang:'hi',
        location:{ type:'Point', coordinates:[77.1000,28.7000], address:'Rohini Sector 18', city:'Delhi', state:'Delhi', pincode:'110085', formattedAddress:'Rohini Sec 18, New Delhi' },
        reportedBy:ravi._id, routedTo:mcd._id, voteCount:134, priority:'critical', statusHistory:[{ status:'reported', changedBy:ravi._id, changedByRole:'citizen' }, { status:'inprogress', changedBy:admin._id, changedByRole:'government' }],
      }
    ]);
    console.log('✅ Created 15 varied sample issues across 4 governance bodies');

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Municipal Corporations & Panchayats added:');
    govBodies.forEach(b => console.log(`  - ${b.name} (${b.code}) -> admin@${b.code.toLowerCase()}.gov.in`));
    
    console.log('\nDemo credentials:');
    console.log('  Citizen:          priya@example.com   / Test@1234');
    console.log('  NGO:              ngo@greenearth.org  / Test@1234');
    console.log('  Admin:            admin@streetsolve.in / Admin@123');
    console.log('  All Govt bodies:  admin@<CODE>.gov.in / Govt@1234 (e.g. admin@gvmc.gov.in)');
    process.exit(0);
  } catch(err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};
seed();
