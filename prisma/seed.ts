import { PrismaClient, UserRole, VoucherStatus, ConsumptionStatus, OrderStatus, PaymentStatus, TransactionStatus, PaymentType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed database...');

  // Clean existing data (in dependency order)
  await prisma.consumption.deleteMany();
  await prisma.drinkVoucher.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.vendingMachine.deleteMany();
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
      isActive: true,
    },
  });

  const regularUser3 = await prisma.user.create({
    data: {
      phone: '+919876543212',
      email: 'arjun@example.com',
      name: 'Arjun Singh',
      password: hashedPassword,
      isVerified: true,
      role: UserRole.USER,
      isActive: true,
    },
  });

  console.log('👥 Created users with different roles');

  // Create Vending Machines
  const vendingMachines = await Promise.all([
    prisma.vendingMachine.create({
      data: {
        machineId: 'VM_GYM_ANDHERI_01',
        name: 'Andheri Gym Machine',
        location: "Gold's Gym, Andheri West",
        address: "Gold's Gym, SV Road, Andheri West, Mumbai",
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400058',
        isActive: true,
        isOnline: true,
        qrCode: 'QR_VM_GYM_ANDHERI_01',
        qrCodeType: 'MACHINE_ID',
        apiEndpoint: 'https://api.vendingmachine.com/vm-gym-andheri-01',
        version: '2.1.3',
        lastPing: new Date(),
      },
    }),
    
    prisma.vendingMachine.create({
      data: {
        machineId: 'VM_OFFICE_POWAI_01',
        name: 'Powai Tech Park Machine',
        location: 'Hiranandani Business Park, Powai',
        address: 'Hiranandani Business Park, Powai, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400076',
        isActive: true,
        isOnline: true,
        qrCode: 'QR_VM_OFFICE_POWAI_01',
        qrCodeType: 'MACHINE_ID',
        apiEndpoint: 'https://api.vendingmachine.com/vm-office-powai-01',
        version: '2.1.3',
        lastPing: new Date(),
      },
    }),

    prisma.vendingMachine.create({
      data: {
        machineId: 'VM_COLLEGE_PUNE_01',
        name: 'Pune College Machine',
        location: 'Fergusson College Campus',
        address: 'Fergusson College, Pune University Road, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411004',
        isActive: true,
        isOnline: false,
        qrCode: 'QR_VM_COLLEGE_PUNE_01',
        qrCodeType: 'MACHINE_ID',
        apiEndpoint: 'https://api.vendingmachine.com/vm-college-pune-01',
        version: '2.0.1',
        lastPing: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
    }),

    prisma.vendingMachine.create({
      data: {
        machineId: 'VM_MALL_DELHI_01',
        name: 'Delhi Mall Machine',
        location: 'Select City Walk, Saket',
        address: 'Select City Walk Mall, Saket, New Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110017',
        isActive: false, // Maintenance
        isOnline: false,
        qrCode: 'QR_VM_MALL_DELHI_01',
        qrCodeType: 'MACHINE_ID',
        apiEndpoint: 'https://api.vendingmachine.com/vm-mall-delhi-01',
        version: '1.9.2',
        lastPing: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    }),
  ]);

  console.log('🤖 Created vending machines');

  // Create Sample Payment Methods
  await prisma.paymentMethod.createMany({
    data: [
      {
        userId: regularUser1.id,
        type: PaymentType.UPI,
        provider: 'phonepe',
        externalId: 'pm_phonepe_rahul123',
        isDefault: true,
        lastFour: '3210',
      },
      {
        userId: regularUser2.id,
        type: PaymentType.UPI,
        provider: 'phonepe',
        externalId: 'pm_phonepe_priya456',
        isDefault: true,
        lastFour: '3211',
      },
      {
        userId: regularUser3.id,
        type: PaymentType.CREDIT_CARD,
        provider: 'phonepe',
        externalId: 'pm_phonepe_arjun789',
        isDefault: true,
        lastFour: '1234',
      },
    ],
  });

  console.log('💳 Created payment methods');

  // Create Sample Orders
  const order1 = await prisma.order.create({
    data: {
      userId: regularUser1.id,
      orderNumber: 'ORD-2024-001',
      orderType: 'VOUCHER_PURCHASE',
      totalDrinks: 20,
      totalAmount: 500.00,
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: regularUser2.id,
      orderNumber: 'ORD-2024-002',
      orderType: 'VOUCHER_PURCHASE',
      totalDrinks: 15,
      totalAmount: 375.00,
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  const order3 = await prisma.order.create({
    data: {
      userId: regularUser3.id,
      orderNumber: 'ORD-2024-003',
      orderType: 'VOUCHER_PURCHASE',
      totalDrinks: 30,
      totalAmount: 720.00,
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  console.log('📋 Created sample orders');

  // Create Sample Transactions
  await prisma.transaction.createMany({
    data: [
      {
        userId: regularUser1.id,
        orderId: order1.id,
        amount: 500.00,
        status: TransactionStatus.SUCCESS,
        type: 'PAYMENT',
        currency: 'INR',
        phonepeTransactionId: 'PHONEPE_TXN_001',
        phonepeOrderId: 'PHONEPE_ORD_001',
        phonepeMerchantId: 'MERCHANT_TXN_001',
        processedAt: new Date(),
      },
      {
        userId: regularUser2.id,
        orderId: order2.id,
        amount: 375.00,
        status: TransactionStatus.SUCCESS,
        type: 'PAYMENT',
        currency: 'INR',
        phonepeTransactionId: 'PHONEPE_TXN_002',
        phonepeOrderId: 'PHONEPE_ORD_002',
        phonepeMerchantId: 'MERCHANT_TXN_002',
        processedAt: new Date(),
      },
      {
        userId: regularUser3.id,
        orderId: order3.id,
        amount: 720.00,
        status: TransactionStatus.SUCCESS,
        type: 'PAYMENT',
        currency: 'INR',
        phonepeTransactionId: 'PHONEPE_TXN_003',
        phonepeOrderId: 'PHONEPE_ORD_003',
        phonepeMerchantId: 'MERCHANT_TXN_003',
        processedAt: new Date(),
      },
    ],
  });

  console.log('💰 Created sample transactions');

  // Create Sample Drink Vouchers
  const voucher1 = await prisma.drinkVoucher.create({
    data: {
      userId: regularUser1.id,
      orderId: order1.id,
      voucherNumber: 'VCH-2024-001234',
      totalDrinks: 20,
      consumedDrinks: 8,
      pricePerDrink: 25.00,
      totalPrice: 500.00,
      status: VoucherStatus.ACTIVE,
      isActivated: true,
      purchaseDate: new Date('2024-01-15'),
      firstUsedAt: new Date('2024-01-16'),
      expiryDate: new Date('2024-03-15'), // 2 months validity
    },
  });

  const voucher2 = await prisma.drinkVoucher.create({
    data: {
      userId: regularUser2.id,
      orderId: order2.id,
      voucherNumber: 'VCH-2024-001235',
      totalDrinks: 15,
      consumedDrinks: 3,
      pricePerDrink: 25.00,
      totalPrice: 375.00,
      status: VoucherStatus.ACTIVE,
      isActivated: true,
      purchaseDate: new Date('2024-01-20'),
      firstUsedAt: new Date('2024-01-21'),
      expiryDate: new Date('2024-03-20'),
    },
  });

  const voucher3 = await prisma.drinkVoucher.create({
    data: {
      userId: regularUser3.id,
      orderId: order3.id,
      voucherNumber: 'VCH-2024-001236',
      totalDrinks: 30,
      consumedDrinks: 0,
      pricePerDrink: 24.00, // Bulk discount
      totalPrice: 720.00,
      status: VoucherStatus.ACTIVE,
      isActivated: false, // Not used yet
      purchaseDate: new Date('2024-01-25'),
      firstUsedAt: null,
      expiryDate: new Date('2024-04-25'), // 3 months validity
    },
  });

  // Create an exhausted voucher for demo
  const exhaustedVoucher = await prisma.drinkVoucher.create({
    data: {
      userId: regularUser1.id,
      voucherNumber: 'VCH-2024-001230', // Earlier voucher
      totalDrinks: 10,
      consumedDrinks: 10,
      pricePerDrink: 25.00,
      totalPrice: 250.00,
      status: VoucherStatus.EXHAUSTED,
      isActivated: true,
      purchaseDate: new Date('2024-01-01'),
      firstUsedAt: new Date('2024-01-02'),
      expiryDate: new Date('2024-03-01'),
    },
  });

  console.log('🎫 Created sample drink vouchers');

  // Create Sample Consumptions
  await prisma.consumption.createMany({
    data: [
      // Rahul's consumption from voucher1
      {
        userId: regularUser1.id,
        voucherId: voucher1.id,
        quantity: 1,
        consumedAt: new Date('2024-01-16T09:30:00Z'),
        machineId: 'VM_GYM_ANDHERI_01',
        machineQRCode: 'QR_VM_GYM_ANDHERI_01',
        location: "Gold's Gym, Andheri West",
        drinkType: 'Energy Drink',
        drinkSlot: 'A1',
        externalTransactionId: 'VM_TXN_001',
        vendingSessionId: 'SESSION_001',
        status: ConsumptionStatus.COMPLETED,
        preConsumptionBalance: 20,
        postConsumptionBalance: 19,
        voucherVersion: 1,
      },
      {
        userId: regularUser1.id,
        voucherId: voucher1.id,
        quantity: 2,
        consumedAt: new Date('2024-01-17T11:45:00Z'),
        machineId: 'VM_GYM_ANDHERI_01',
        machineQRCode: 'QR_VM_GYM_ANDHERI_01',
        location: "Gold's Gym, Andheri West",
        drinkType: 'Protein Shake',
        drinkSlot: 'B2',
        externalTransactionId: 'VM_TXN_002',
        vendingSessionId: 'SESSION_002',
        status: ConsumptionStatus.COMPLETED,
        preConsumptionBalance: 19,
        postConsumptionBalance: 17,
        voucherVersion: 2,
      },
      {
        userId: regularUser1.id,
        voucherId: voucher1.id,
        quantity: 3,
        consumedAt: new Date('2024-01-18T14:20:00Z'),
        machineId: 'VM_OFFICE_POWAI_01',
        machineQRCode: 'QR_VM_OFFICE_POWAI_01',
        location: 'Hiranandani Business Park, Powai',
        drinkType: 'Hydration Drink',
        drinkSlot: 'C1',
        externalTransactionId: 'VM_TXN_003',
        vendingSessionId: 'SESSION_003',
        status: ConsumptionStatus.COMPLETED,
        preConsumptionBalance: 17,
        postConsumptionBalance: 14,
        voucherVersion: 3,
      },
      {
        userId: regularUser1.id,
        voucherId: voucher1.id,
        quantity: 2,
        consumedAt: new Date('2024-01-19T16:15:00Z'),
        machineId: 'VM_GYM_ANDHERI_01',
        machineQRCode: 'QR_VM_GYM_ANDHERI_01',
        location: "Gold's Gym, Andheri West",
        drinkType: 'Energy Drink',
        drinkSlot: 'A1',
        externalTransactionId: 'VM_TXN_004',
        vendingSessionId: 'SESSION_004',
        status: ConsumptionStatus.COMPLETED,
        preConsumptionBalance: 14,
        postConsumptionBalance: 12,
        voucherVersion: 4,
      },
      
      // Priya's consumption from voucher2
      {
        userId: regularUser2.id,
        voucherId: voucher2.id,
        quantity: 1,
        consumedAt: new Date('2024-01-21T10:00:00Z'),
        machineId: 'VM_COLLEGE_PUNE_01',
        machineQRCode: 'QR_VM_COLLEGE_PUNE_01',
        location: 'Fergusson College Campus',
        drinkType: 'Vitamin Water',
        drinkSlot: 'D1',
        externalTransactionId: 'VM_TXN_005',
        vendingSessionId: 'SESSION_005',
        status: ConsumptionStatus.COMPLETED,
        preConsumptionBalance: 15,
        postConsumptionBalance: 14,
        voucherVersion: 1,
      },
      {
        userId: regularUser2.id,
        voucherId: voucher2.id,
        quantity: 2,
        consumedAt: new Date('2024-01-22T15:30:00Z'),
        machineId: 'VM_COLLEGE_PUNE_01',
        machineQRCode: 'QR_VM_COLLEGE_PUNE_01',
        location: 'Fergusson College Campus',
        drinkType: 'Energy Drink',
        drinkSlot: 'A2',
        externalTransactionId: 'VM_TXN_006',
        vendingSessionId: 'SESSION_006',
        status: ConsumptionStatus.COMPLETED,
        preConsumptionBalance: 14,
        postConsumptionBalance: 12,
        voucherVersion: 2,
      },
      
      // Consumption from exhausted voucher (Rahul's old voucher)
      {
        userId: regularUser1.id,
        voucherId: exhaustedVoucher.id,
        quantity: 5,
        consumedAt: new Date('2024-01-10T12:00:00Z'),
        machineId: 'VM_GYM_ANDHERI_01',
        machineQRCode: 'QR_VM_GYM_ANDHERI_01',
        location: "Gold's Gym, Andheri West",
        drinkType: 'Mixed Drinks',
        drinkSlot: 'BULK',
        externalTransactionId: 'VM_TXN_BULK_001',
        vendingSessionId: 'SESSION_BULK_001',
        status: ConsumptionStatus.COMPLETED,
        preConsumptionBalance: 10,
        postConsumptionBalance: 5,
        voucherVersion: 1,
      },
      {
        userId: regularUser1.id,
        voucherId: exhaustedVoucher.id,
        quantity: 5,
        consumedAt: new Date('2024-01-12T18:00:00Z'),
        machineId: 'VM_GYM_ANDHERI_01',
        machineQRCode: 'QR_VM_GYM_ANDHERI_01',
        location: "Gold's Gym, Andheri West",
        drinkType: 'Mixed Drinks',
        drinkSlot: 'BULK',
        externalTransactionId: 'VM_TXN_BULK_002',
        vendingSessionId: 'SESSION_BULK_002',
        status: ConsumptionStatus.COMPLETED,
        preConsumptionBalance: 5,
        postConsumptionBalance: 0,
        voucherVersion: 2,
      },
    ],
  });

  console.log('🥤 Created sample consumptions');

  console.log('✅ Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(`- Vending Machines: ${await prisma.vendingMachine.count()}`);
  console.log(`- Orders: ${await prisma.order.count()}`);
  console.log(`- Drink Vouchers: ${await prisma.drinkVoucher.count()}`);
  console.log(`- Consumptions: ${await prisma.consumption.count()}`);
  console.log(`- Payment Methods: ${await prisma.paymentMethod.count()}`);
  console.log(`- Transactions: ${await prisma.transaction.count()}`);
  
  console.log('\n👥 Sample Users Created:');
  console.log('- Admin: +919999999999 (admin@smartshake.com)');
  console.log('- Tech: +919888888888 (tech@smartshake.com)');
  console.log('- User: +919876543210 (rahul@example.com) - Has active voucher with 12/20 drinks remaining');
  console.log('- User: +919876543211 (priya@example.com) - Has active voucher with 12/15 drinks remaining');
  console.log('- User: +919876543212 (arjun@example.com) - Has unused voucher with 30/30 drinks');
  console.log('\n🎫 Voucher Status:');
  console.log('- VCH-2024-001234: ACTIVE (12 drinks remaining)');
  console.log('- VCH-2024-001235: ACTIVE (12 drinks remaining)');
  console.log('- VCH-2024-001236: ACTIVE (30 drinks remaining, unused)');
  console.log('- VCH-2024-001230: EXHAUSTED (example of fully consumed voucher)');
  console.log('\n🤖 Vending Machines:');
  console.log('- VM_GYM_ANDHERI_01: ACTIVE, ONLINE (Mumbai)');
  console.log('- VM_OFFICE_POWAI_01: ACTIVE, ONLINE (Mumbai)');
  console.log('- VM_COLLEGE_PUNE_01: ACTIVE, OFFLINE (Pune)');
  console.log('- VM_MALL_DELHI_01: INACTIVE, OFFLINE (Delhi - Maintenance)');
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