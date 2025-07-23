import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users with phone numbers
  const user1 = await prisma.user.upsert({
    where: { phone: '+1234567890' },
    update: {},
    create: {
      phone: '+1234567890',
      email: 'john@example.com',
      name: 'John Doe',
      isVerified: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { phone: '+1987654321' },
    update: {},
    create: {
      phone: '+1987654321',
      email: 'jane@example.com',
      name: 'Jane Smith',
      isVerified: true,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { phone: '+1555123456' },
    update: {},
    create: {
      phone: '+1555123456',
      name: 'Bob Wilson',
      isVerified: false, // Not verified yet
    },
  });

  console.log('✅ Database seeded successfully');
  console.log(`Created users:`);
  console.log(`- ${user1.name} (${user1.phone})`);
  console.log(`- ${user2.name} (${user2.phone})`);
  console.log(`- ${user3.name} (${user3.phone})`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 