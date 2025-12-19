const express = require('express');
const { Driver, Transaction } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all drivers
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, isActive, department } = req.query;
    
    let query = {};
    
    // Default to active drivers only (unless explicitly requested otherwise)
    if (isActive === undefined) {
      query.isActive = true;
    } else if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }
    
    // Search by name, employeeId, email, or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by department
    if (department) {
      query.department = department;
    }
    
    const drivers = await Driver.find(query)
      .populate('currentlyIssuedItems.item', 'name photo')
      .sort({ name: 1 });
    
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Жолоочдын жагсаалт авахад алдаа гарлаа', error: error.message });
  }
});

// Get single driver
router.get('/:id', authenticate, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('currentlyIssuedItems.item', 'name photo barcode');
    
    if (!driver) {
      return res.status(404).json({ message: 'Жолооч олдсонгүй' });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Жолоочийн мэдээлэл авахад алдаа гарлаа', error: error.message });
  }
});

// Get driver by employee ID
router.get('/employee/:employeeId', authenticate, async (req, res) => {
  try {
    const driver = await Driver.findOne({ employeeId: req.params.employeeId })
      .populate('currentlyIssuedItems.item', 'name photo barcode');
    
    if (!driver) {
      return res.status(404).json({ message: 'Жолооч олдсонгүй' });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Жолоочийн мэдээлэл авахад алдаа гарлаа', error: error.message });
  }
});

// Create new driver
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, employeeId, email, phone, photo, department } = req.body;

    // Check if employee ID already exists
    const existingDriver = await Driver.findOne({ employeeId });
    if (existingDriver) {
      return res.status(400).json({ message: 'Ажилтны дугаар бүртгэлтэй байна' });
    }

    const driver = new Driver({
      name,
      employeeId,
      email,
      phone,
      photo,
      department
    });

    await driver.save();
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Жолооч үүсгэхэд алдаа гарлаа', error: error.message });
  }
});

// Update driver
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, employeeId, email, phone, photo, department, isActive } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Жолооч олдсонгүй' });
    }

    // Check if new employee ID conflicts with another driver
    if (employeeId && employeeId !== driver.employeeId) {
      const existingDriver = await Driver.findOne({ employeeId });
      if (existingDriver) {
        return res.status(400).json({ message: 'Ажилтны дугаар бүртгэлтэй байна' });
      }
    }

    // Update fields
    if (name !== undefined) driver.name = name;
    if (employeeId !== undefined) driver.employeeId = employeeId;
    if (email !== undefined) driver.email = email;
    if (phone !== undefined) driver.phone = phone;
    if (photo !== undefined) driver.photo = photo;
    if (department !== undefined) driver.department = department;
    if (isActive !== undefined) driver.isActive = isActive;

    await driver.save();
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Жолоочийн мэдээлэл шинэчлэхэд алдаа гарлаа', error: error.message });
  }
});

// Delete driver (soft delete) - allows deletion with issued items
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { force } = req.query;
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Жолооч олдсонгүй' });
    }

    // Check if driver has issued items - warn but allow if force=true
    if (driver.currentlyIssuedItems && driver.currentlyIssuedItems.length > 0 && force !== 'true') {
      return res.status(400).json({ 
        message: 'Энэ жолоочид олгосон бараа байна. Устгахдаа итгэлтэй байна уу?',
        hasIssuedItems: true,
        issuedItemsCount: driver.currentlyIssuedItems.length
      });
    }

    // Just soft delete the driver, don't return items to inventory
    driver.isActive = false;
    await driver.save();
    
    res.json({ message: 'Жолооч амжилттай устгагдлаа' });
  } catch (error) {
    res.status(500).json({ message: 'Жолооч устгахад алдаа гарлаа', error: error.message });
  }
});

// Get driver's transaction history
router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    const transactions = await Transaction.find({ driver: req.params.id })
      .populate('items.item', 'name photo')
      .populate('performedBy', 'username')
      .sort({ transactionDate: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments({ driver: req.params.id });
    
    res.json({ transactions, total });
  } catch (error) {
    res.status(500).json({ message: 'Түүх авахад алдаа гарлаа', error: error.message });
  }
});

// Get all unique departments
router.get('/meta/departments', authenticate, async (req, res) => {
  try {
    const departments = await Driver.distinct('department');
    res.json(departments.filter(d => d)); // Filter out null/empty values
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
});

module.exports = router;
