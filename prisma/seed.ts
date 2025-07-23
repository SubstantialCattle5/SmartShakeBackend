import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password: 'hashed-password-here', // In real app, this should be properly hashed
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      password: 'hashed-password-here',
    },
  });

  // Create posts
  await prisma.post.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Welcome to SmartShake',
      content: 'This is the first post in our SmartShake application.',
      published: true,
      authorId: user1.id,
    },
  });

  await prisma.post.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'Getting Started with API',
      content: 'Learn how to use our RESTful API endpoints.',
      published: false,
      authorId: user2.id,
    },
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 