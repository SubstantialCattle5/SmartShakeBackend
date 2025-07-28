import { PrismaClient, UserRole, FeedbackType, FeedbackCategory, FeedbackPriority } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed database...');

  // Clean existing data
  await prisma.feedbackAttachment.deleteMany();
  await prisma.feedbackResponse.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.drinkConsumption.deleteMany();
  await prisma.userSubscription.deleteMany();
  await prisma.packageItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.subscriptionPackage.deleteMany();
  await prisma.drinkProduct.deleteMany();
  await prisma.vendingMachineReference.deleteMany();
  await prisma.blacklistedToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data');

  // Create Users with different roles
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      phone: '+919999999999',
      email: 'admin@smartshake.com',
      name: 'System Admin',
      password: hashedPassword,
      isVerified: true,
      role: UserRole.ADMIN,
      qrCode: 'ADMIN_QR_001',
      isActive: true,
    },
  });

  const techUser = await prisma.user.create({
    data: {
      phone: '+919888888888',
      email: 'tech@smartshake.com',
      name: 'Technical Support',
      password: hashedPassword,
      isVerified: true,
      role: UserRole.TECH,
      qrCode: 'TECH_QR_001',
      isActive: true,
    },
  });

  const regularUser1 = await prisma.user.create({
    data: {
      phone: '+919876543210',
      email: 'rahul@example.com',
      name: 'Rahul Sharma',
      password: hashedPassword,
      isVerified: true,
      role: UserRole.USER,
      qrCode: 'USR_2024_ABC123',
      isActive: true,
    },
  });

  const regularUser2 = await prisma.user.create({
    data: {
      phone: '+919876543211',
      email: 'priya@example.com',
      name: 'Priya Patel',
      isVerified: true,
      role: UserRole.USER,
      qrCode: 'USR_2024_XYZ456',
      isActive: true,
    },
  });

  console.log('👥 Created users with different roles');

  // Create Drink Products
  const energyBoostMango = await prisma.drinkProduct.create({
    data: {
      name: 'Energy Boost Mango',
      description: 'High-energy sports drink with tropical mango flavor',
      flavor: 'Mango',
      sizeML: 500,
      unitPrice: 30.00,
      imageUrl: 'https://example.com/energy-boost-mango.jpg',
      isActive: true,
      averageRating: 4.5,
      totalReviews: 89,
      nutritionInfo: {
        calories: 45,
        protein: '2g',
        carbs: '11g',
        electrolytes: 'high',
        caffeine: '80mg',
      },
    },
  });

  const hydrationPro = await prisma.drinkProduct.create({
    data: {
      name: 'Hydration Pro Berry',
      description: 'Electrolyte-rich hydration drink with mixed berry flavor',
      flavor: 'Mixed Berry',
      sizeML: 500,
      unitPrice: 25.00,
      imageUrl: 'https://example.com/hydration-pro-berry.jpg',
      isActive: true,
      averageRating: 4.2,
      totalReviews: 67,
      nutritionInfo: {
        calories: 25,
        protein: '0g',
        carbs: '6g',
        electrolytes: 'very high',
        caffeine: '0mg',
      },
    },
  });

  const proteinRecovery = await prisma.drinkProduct.create({
    data: {
      name: 'Protein Recovery Chocolate',
      description: 'Post-workout protein drink with rich chocolate flavor',
      flavor: 'Chocolate',
      sizeML: 500,
      unitPrice: 40.00,
      imageUrl: 'https://example.com/protein-recovery-chocolate.jpg',
      isActive: true,
      averageRating: 4.7,
      totalReviews: 112,
      nutritionInfo: {
        calories: 120,
        protein: '20g',
        carbs: '8g',
        electrolytes: 'medium',
        caffeine: '0mg',
      },
    },
  });

  const vitaminWater = await prisma.drinkProduct.create({
    data: {
      name: 'Vitamin Water Citrus',
      description: 'Vitamin-enriched water with refreshing citrus flavor',
      flavor: 'Citrus',
      sizeML: 500,
      unitPrice: 20.00,
      imageUrl: 'https://example.com/vitamin-water-citrus.jpg',
      isActive: true,
      averageRating: 3.9,
      totalReviews: 45,
      nutritionInfo: {
        calories: 15,
        protein: '0g',
        carbs: '4g',
        vitamins: 'C, B6, B12',
        caffeine: '0mg',
      },
    },
  });

  console.log('🥤 Created drink products');

  // Create Subscription Packages
  const gymWarriorPack = await prisma.subscriptionPackage.create({
    data: {
      name: 'Gym Warrior Pack',
      description: 'Perfect for intense workouts and muscle recovery',
      totalPrice: 500.00,
      originalPrice: 600.00,
      savingsAmount: 100.00,
      validityDays: 30,
      isActive: true,
      category: 'gym',
      averageRating: 4.6,
      totalReviews: 234,
    },
  });

  const officeHydration = await prisma.subscriptionPackage.create({
    data: {
      name: 'Office Hydration Pack',
      description: 'Stay hydrated throughout your workday',
      totalPrice: 300.00,
      originalPrice: 375.00,
      savingsAmount: 75.00,
      validityDays: 20,
      isActive: true,
      category: 'office',
      averageRating: 4.3,
      totalReviews: 156,
    },
  });

  const studentBudget = await prisma.subscriptionPackage.create({
    data: {
      name: 'Student Budget Pack',
      description: 'Affordable energy and hydration for students',
      totalPrice: 200.00,
      originalPrice: 250.00,
      savingsAmount: 50.00,
      validityDays: 15,
      isActive: true,
      category: 'student',
      averageRating: 4.1,
      totalReviews: 89,
    },
  });

  console.log('📦 Created subscription packages');

  // Create Package Items
  await prisma.packageItem.createMany({
    data: [
      // Gym Warrior Pack
      { packageId: gymWarriorPack.id, productId: energyBoostMango.id, quantity: 8 },
      { packageId: gymWarriorPack.id, productId: proteinRecovery.id, quantity: 6 },
      { packageId: gymWarriorPack.id, productId: hydrationPro.id, quantity: 6 },
      
      // Office Hydration Pack
      { packageId: officeHydration.id, productId: hydrationPro.id, quantity: 8 },
      { packageId: officeHydration.id, productId: vitaminWater.id, quantity: 7 },
      
      // Student Budget Pack
      { packageId: studentBudget.id, productId: energyBoostMango.id, quantity: 5 },
      { packageId: studentBudget.id, productId: vitaminWater.id, quantity: 5 },
    ],
  });

  console.log('🔗 Created package items');

  // Create Vending Machine References
  await prisma.vendingMachineReference.createMany({
    data: [
      {
        machineId: 'VM_GYM_ANDHERI_01',
        name: 'Andheri Gym Machine',
        location: "Gold's Gym, Andheri West, Mumbai",
        city: 'Mumbai',
        isActive: true,
        averageRating: 4.2,
        totalReviews: 78,
      },
      {
        machineId: 'VM_OFFICE_POWAI_01',
        name: 'Powai Tech Park Machine',
        location: 'Hiranandani Business Park, Powai, Mumbai',
        city: 'Mumbai',
        isActive: true,
        averageRating: 4.5,
        totalReviews: 123,
      },
      {
        machineId: 'VM_COLLEGE_PUNE_01',
        name: 'Pune College Machine',
        location: 'Fergusson College, Pune',
        city: 'Pune',
        isActive: true,
        averageRating: 3.8,
        totalReviews: 45,
      },
      {
        machineId: 'VM_MALL_DELHI_01',
        name: 'Delhi Mall Machine',
        location: 'Select City Walk, Saket, Delhi',
        city: 'Delhi',
        isActive: false,
        averageRating: 2.1,
        totalReviews: 23,
      },
    ],
  });

  console.log('🤖 Created vending machine references');

  // Create Sample Payment Methods
  await prisma.paymentMethod.createMany({
    data: [
      {
        userId: regularUser1.id,
        type: 'UPI',
        provider: 'phonepe',
        externalId: 'pm_phonepe_rahul123',
        isDefault: true,
        lastFour: '3210',
      },
      {
        userId: regularUser2.id,
        type: 'UPI',
        provider: 'phonepe',
        externalId: 'pm_phonepe_priya456',
        isDefault: true,
        lastFour: '3211',
      },
    ],
  });

  console.log('💳 Created payment methods');

  // Create Sample Orders and Subscriptions
  const order1 = await prisma.order.create({
    data: {
      userId: regularUser1.id,
      orderNumber: 'ORD-2024-001',
      status: 'COMPLETED',
      totalAmount: 500.00,
      paymentStatus: 'PAID',
    },
  });

  const subscription1 = await prisma.userSubscription.create({
    data: {
      userId: regularUser1.id,
      packageId: gymWarriorPack.id,
      orderId: order1.id,
      status: 'ACTIVE',
      startDate: new Date('2024-01-15'),
      expiryDate: new Date('2024-02-14'),
      totalDrinks: 20,
      consumedDrinks: 8,
      remainingDrinks: 12,
      qrCodeGenerated: true,
      qrCodeValue: 'USR_2024_ABC123',
    },
  });

  console.log('📋 Created sample orders and subscriptions');

  // Create Sample Feedback
  await prisma.feedback.createMany({
    data: [
      {
        userId: regularUser1.id,
        feedbackType: FeedbackType.PRODUCT,
        productId: energyBoostMango.id,
        rating: 5,
        title: 'Amazing Energy Boost!',
        comment: 'This mango flavor is incredible! Really helps during workouts.',
        category: FeedbackCategory.QUALITY,
        priority: FeedbackPriority.LOW,
        status: 'RESOLVED',
        isAnonymous: false,
        location: 'Mumbai',
      },
      {
        userId: regularUser2.id,
        feedbackType: FeedbackType.MACHINE,
        machineId: 'VM_MALL_DELHI_01',
        rating: 2,
        title: 'Machine not working properly',
        comment: 'QR code scanner is not working. Had to try multiple times.',
        category: FeedbackCategory.TECHNICAL,
        priority: FeedbackPriority.HIGH,
        status: 'IN_PROGRESS',
        isAnonymous: false,
        location: 'Delhi',
      },
      {
        userId: regularUser1.id,
        feedbackType: FeedbackType.SUBSCRIPTION,
        subscriptionId: subscription1.id,
        packageId: gymWarriorPack.id,
        rating: 5,
        title: 'Excellent value for money',
        comment: 'The gym warrior pack is perfect for my workout routine. Great savings!',
        category: FeedbackCategory.PRICING,
        priority: FeedbackPriority.LOW,
        status: 'CLOSED',
        isAnonymous: false,
        location: 'Mumbai',
      },
      {
        userId: regularUser2.id,
        feedbackType: FeedbackType.SERVICE,
        rating: 4,
        title: 'Great app experience',
        comment: 'Love how easy it is to find nearby machines and track my drinks.',
        category: FeedbackCategory.SERVICE,
        priority: FeedbackPriority.MEDIUM,
        status: 'NEW',
        isAnonymous: false,
      },
    ],
  });

  // Create Feedback Responses
  await prisma.feedbackResponse.createMany({
    data: [
      {
        feedbackId: 1,
        responderId: adminUser.id,
        message: 'Thank you for the wonderful feedback! We\'re glad you love the mango flavor.',
        isInternal: false,
        actionTaken: 'Shared positive feedback with product team',
      },
      {
        feedbackId: 2,
        responderId: techUser.id,
        message: 'Our technical team has been dispatched to fix the QR scanner issue.',
        isInternal: false,
        actionTaken: 'Scheduled maintenance for VM_MALL_DELHI_01',
      },
    ],
  });

  console.log('📝 Created sample feedback and responses');

  // Create Sample Drink Consumptions
  await prisma.drinkConsumption.createMany({
    data: [
      {
        userId: regularUser1.id,
        subscriptionId: subscription1.id,
        productId: energyBoostMango.id,
        machineId: 'VM_GYM_ANDHERI_01',
        quantity: 1,
        consumedAt: new Date('2024-01-16T09:30:00Z'),
        externalTransactionId: 'VM_TXN_001',
        status: 'COMPLETED',
      },
      {
        userId: regularUser1.id,
        subscriptionId: subscription1.id,
        productId: proteinRecovery.id,
        machineId: 'VM_GYM_ANDHERI_01',
        quantity: 1,
        consumedAt: new Date('2024-01-16T11:45:00Z'),
        externalTransactionId: 'VM_TXN_002',
        status: 'COMPLETED',
      },
    ],
  });

  console.log('🥤 Created sample drink consumptions');

  console.log('✅ Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(`- Drink Products: ${await prisma.drinkProduct.count()}`);
  console.log(`- Subscription Packages: ${await prisma.subscriptionPackage.count()}`);
  console.log(`- Vending Machines: ${await prisma.vendingMachineReference.count()}`);
  console.log(`- User Subscriptions: ${await prisma.userSubscription.count()}`);
  console.log(`- Feedback: ${await prisma.feedback.count()}`);
  console.log(`- Drink Consumptions: ${await prisma.drinkConsumption.count()}`);
  
  console.log('\n👥 Sample Users Created:');
  console.log('- Admin: +919999999999 (admin@smartshake.com)');
  console.log('- Tech: +919888888888 (tech@smartshake.com)');
  console.log('- User: +919876543210 (rahul@example.com)');
  console.log('- User: +919876543211 (priya@example.com)');
  console.log('\nPassword for all users: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 