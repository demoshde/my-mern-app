// Seed script to create initial admin user and sample data
require('dotenv').config();
const mongoose = require('mongoose');
const { User, PPEItem, Driver } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ppe-inventory';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep data)
    // await User.deleteMany({});
    // await PPEItem.deleteMany({});
    // await Driver.deleteMany({});

    // Create admin user if doesn't exist
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const admin = new User({
        username: 'admin',
        password: 'admin123', // Will be hashed by pre-save hook
        role: 'admin'
      });
      await admin.save();
      console.log('Admin user created: username=admin, password=admin123');
    } else {
      console.log('Admin user already exists');
    }

    // Create sample PPE items if none exist
    const itemCount = await PPEItem.countDocuments();
    if (itemCount === 0) {
      const sampleItems = [
        {
          name: 'Safety Helmet',
          description: 'Hard hat for head protection',
          type: 'Head Protection',
          size: 'Universal',
          quantity: 50,
          lowStockThreshold: 10,
          barcode: 'PPE-HELMET-001'
        },
        {
          name: 'Safety Glasses',
          description: 'Clear lens protective eyewear',
          type: 'Eye Protection',
          size: 'Universal',
          quantity: 100,
          lowStockThreshold: 20,
          barcode: 'PPE-GLASSES-001'
        },
        {
          name: 'Safety Vest - High Vis',
          description: 'Fluorescent yellow safety vest',
          type: 'Visibility',
          size: 'Large',
          quantity: 75,
          lowStockThreshold: 15,
          barcode: 'PPE-VEST-001'
        },
        {
          name: 'Work Gloves',
          description: 'Leather work gloves for hand protection',
          type: 'Hand Protection',
          size: 'Medium',
          quantity: 8, // Low stock for testing
          lowStockThreshold: 20,
          barcode: 'PPE-GLOVES-001'
        },
        {
          name: 'Steel Toe Boots',
          description: 'Safety boots with steel toe cap',
          type: 'Foot Protection',
          size: '10',
          quantity: 25,
          lowStockThreshold: 5,
          barcode: 'PPE-BOOTS-001'
        },
        {
          name: 'Ear Plugs',
          description: 'Disposable foam ear plugs',
          type: 'Hearing Protection',
          size: 'Universal',
          quantity: 200,
          lowStockThreshold: 50,
          barcode: 'PPE-EARPLUGS-001'
        },
        {
          name: 'Dust Mask N95',
          description: 'N95 respirator dust mask',
          type: 'Respiratory',
          size: 'Universal',
          quantity: 5, // Low stock for testing
          lowStockThreshold: 30,
          barcode: 'PPE-MASK-001',
          expiryDate: new Date('2025-12-31')
        }
      ];

      const QRCode = require('qrcode');
      for (const itemData of sampleItems) {
        itemData.qrCode = await QRCode.toDataURL(itemData.barcode);
        const item = new PPEItem(itemData);
        await item.save();
      }
      console.log('Sample PPE items created');
    } else {
      console.log('PPE items already exist');
    }

    // Create sample drivers if none exist
    const driverCount = await Driver.countDocuments();
    if (driverCount === 0) {
      const sampleDrivers = [
        {
          name: 'John Smith',
          employeeId: 'EMP001',
          email: 'john.smith@company.com',
          phone: '555-0101',
          department: 'Warehouse'
        },
        {
          name: 'Sarah Johnson',
          employeeId: 'EMP002',
          email: 'sarah.johnson@company.com',
          phone: '555-0102',
          department: 'Delivery'
        },
        {
          name: 'Mike Wilson',
          employeeId: 'EMP003',
          email: 'mike.wilson@company.com',
          phone: '555-0103',
          department: 'Warehouse'
        },
        {
          name: 'Emily Brown',
          employeeId: 'EMP004',
          email: 'emily.brown@company.com',
          phone: '555-0104',
          department: 'Delivery'
        },
        {
          name: 'David Lee',
          employeeId: 'EMP005',
          email: 'david.lee@company.com',
          phone: '555-0105',
          department: 'Maintenance'
        }
      ];

      for (const driverData of sampleDrivers) {
        const driver = new Driver(driverData);
        await driver.save();
      }
      console.log('Sample drivers created');
    } else {
      console.log('Drivers already exist');
    }

    console.log('\nSeed completed successfully!');
    console.log('You can login with: username=admin, password=admin123');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
