import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { Candidate } from './models/Candidate';
import { UserRole, CandidateStatus } from './types';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lotus_hack';

const users = [
  {
    email: 'admin@lotushack.com',
    password: 'Admin123!',
    role: UserRole.ADMIN,
    firstName: 'System',
    lastName: 'Admin',
  },
  {
    email: 'hr@lotushack.com',
    password: 'Hr123456!',
    role: UserRole.HR,
    firstName: 'Nguyen',
    lastName: 'HR Manager',
  },
  {
    email: 'candidate1@test.com',
    password: 'Candidate123!',
    role: UserRole.CANDIDATE,
    firstName: 'John',
    lastName: 'Doe',
  },
  {
    email: 'candidate2@test.com',
    password: 'Candidate123!',
    role: UserRole.CANDIDATE,
    firstName: 'Jane',
    lastName: 'Smith',
  },
  {
    email: 'candidate3@test.com',
    password: 'Candidate123!',
    role: UserRole.CANDIDATE,
    firstName: 'Bob',
    lastName: 'Johnson',
  },
];

const seed = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Candidate.deleteMany({});
    console.log('Cleared existing data');

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      const user = await User.create({
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      console.log(`Created user: ${userData.email} (${userData.role})`);

      if (userData.role === UserRole.CANDIDATE) {
        const candidateData = [
          { skills: ['JavaScript', 'React', 'Node.js'], experience: 3, education: 'FPT University' },
          { skills: ['Python', 'Django', 'PostgreSQL'], experience: 5, education: 'UIT' },
          { skills: ['Java', 'Spring Boot', 'MongoDB'], experience: 2, education: 'HCMUS' },
        ];
        const idx = users
          .filter((u) => u.role === UserRole.CANDIDATE)
          .findIndex((u) => u.email === userData.email);
        const cd = candidateData[idx];

        await Candidate.create({
          userId: user._id,
          skills: cd.skills,
          experience: cd.experience,
          education: cd.education,
          applicationStatus: CandidateStatus.PENDING,
        });

        console.log(`  └── Candidate profile: ${cd.skills.join(', ')} | ${cd.experience}y exp`);
      }
    }

    console.log('\n--- Test Credentials ---');
    for (const u of users) {
      console.log(`Email: ${u.email}`);
      console.log(`Pass:  ${u.password}`);
      console.log('');
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
