require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const legacyUsers = [
  {
    employeeId: '1005',
    fullName: 'عمير',
    email: 'omair@nauss.edu.sa',
    mobile: '0590600061',
    department: 'وكالة التدريب',
    jobTitle: 'موظف',
    passwordHash: 'admin123',
    role: 'USER',
    status: 'ACTIVE',
    acceptedAt: '2026-03-18T02:53:20.629Z',
  },
  {
    employeeId: 'NAUSS-003',
    fullName: 'مستخدم تجريبي',
    email: 'user1@nauss.edu.sa',
    mobile: '0500000001',
    department: 'إدارة عمليات التدريب',
    jobTitle: 'موظف',
    passwordHash: 'admin123',
    role: 'USER',
    status: 'ACTIVE',
    acceptedAt: '2026-03-18T00:07:39.091Z',
  },
];

async function main() {
  for (const user of legacyUsers) {
    const saved = await prisma.user.upsert({
      where: { email: user.email.toLowerCase() },
      update: {
        employeeId: user.employeeId,
        fullName: user.fullName,
        mobile: user.mobile,
        department: user.department,
        jobTitle: user.jobTitle,
        passwordHash: user.passwordHash,
        role: user.role,
        status: user.status,
      },
      create: {
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email.toLowerCase(),
        mobile: user.mobile,
        department: user.department,
        jobTitle: user.jobTitle,
        passwordHash: user.passwordHash,
        role: user.role,
        status: user.status,
      },
    });

    await prisma.undertaking.upsert({
      where: { userId: saved.id },
      update: {
        accepted: true,
        acceptedAt: new Date(user.acceptedAt),
        version: '1.0',
      },
      create: {
        userId: saved.id,
        accepted: true,
        acceptedAt: new Date(user.acceptedAt),
        version: '1.0',
      },
    });
  }

  console.log('✅ legacy users migrated');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });