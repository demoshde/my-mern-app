const express = require('express');
const { Transaction, PPEItem, Driver } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Dashboard stats
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const totalItems = await PPEItem.countDocuments({ isActive: true });
    const totalDrivers = await Driver.countDocuments({ isActive: true });
    
    // Get all active items to calculate low stock (using virtual)
    const allItems = await PPEItem.find({ isActive: true });
    const lowStockItems = allItems.filter(item => item.isLowStock).length;
    
    // Calculate total stock value (quantity)
    const totalStock = allItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTransactions = await Transaction.countDocuments({
      transactionDate: { $gte: today }
    });
    
    // Items currently issued (from all drivers)
    const driversWithItems = await Driver.find({ 
      isActive: true, 
      'currentlyIssuedItems.0': { $exists: true } 
    });
    const itemsCurrentlyIssued = driversWithItems.reduce((sum, driver) => {
      return sum + driver.currentlyIssuedItems.reduce((s, i) => s + i.quantity, 0);
    }, 0);

    res.json({
      totalItems,
      totalDrivers,
      lowStockItems,
      totalStock,
      todayTransactions,
      itemsCurrentlyIssued,
      driversWithIssuedItems: driversWithItems.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
});

// Current stock report
router.get('/stock', authenticate, async (req, res) => {
  try {
    const items = await PPEItem.find({ isActive: true })
      .select('name type size quantity lowStockThreshold barcode expiryDate')
      .sort({ name: 1 });

    const report = items.map(item => ({
      id: item._id,
      name: item.name,
      type: item.type,
      size: item.size,
      quantity: item.quantity,
      lowStockThreshold: item.lowStockThreshold,
      isLowStock: item.isLowStock,
      barcode: item.barcode,
      expiryDate: item.expiryDate
    }));

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock report', error: error.message });
  }
});

// Items per driver report
router.get('/items-per-driver', authenticate, async (req, res) => {
  try {
    const drivers = await Driver.find({ isActive: true })
      .populate('currentlyIssuedItems.item', 'name type size')
      .select('name employeeId department currentlyIssuedItems')
      .sort({ name: 1 });

    const report = drivers.map(driver => ({
      driverId: driver._id,
      name: driver.name,
      employeeId: driver.employeeId,
      department: driver.department,
      totalItems: driver.currentlyIssuedItems.reduce((sum, i) => sum + i.quantity, 0),
      items: driver.currentlyIssuedItems.map(i => ({
        itemId: i.item?._id,
        name: i.item?.name,
        type: i.item?.type,
        size: i.item?.size,
        quantity: i.quantity,
        issuedDate: i.issuedDate
      }))
    }));

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items per driver report', error: error.message });
  }
});

// Issuance history report
router.get('/issuance-history', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    let query = {};
    
    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) {
        query.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.transactionDate.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query)
      .populate('driver', 'name employeeId')
      .populate('items.item', 'name type size')
      .populate('performedBy', 'username')
      .sort({ transactionDate: -1 });

    const report = transactions.map(t => ({
      id: t._id,
      type: t.type,
      date: t.transactionDate,
      driver: {
        name: t.driver?.name,
        employeeId: t.driver?.employeeId
      },
      items: t.items.map(i => ({
        name: i.item?.name || i.itemName,
        type: i.item?.type,
        quantity: i.quantity,
        condition: i.condition
      })),
      notes: t.notes,
      performedBy: t.performedBy?.username
    }));

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching issuance history', error: error.message });
  }
});

// Export CSV - Stock Report
router.get('/export/stock', authenticate, async (req, res) => {
  try {
    const items = await PPEItem.find({ isActive: true }).sort({ name: 1 });

    const csvHeader = 'Name,Type,Size,Quantity,Low Stock Threshold,Is Low Stock,Barcode,Expiry Date\n';
    const csvRows = items.map(item => 
      `"${item.name}","${item.type || ''}","${item.size || ''}",${item.quantity},${item.lowStockThreshold},${item.isLowStock},"${item.barcode || ''}","${item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : ''}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=stock-report.csv');
    res.send(csvHeader + csvRows);
  } catch (error) {
    res.status(500).json({ message: 'Error exporting stock report', error: error.message });
  }
});

// Export CSV - Items per Driver
router.get('/export/items-per-driver', authenticate, async (req, res) => {
  try {
    const drivers = await Driver.find({ isActive: true })
      .populate('currentlyIssuedItems.item', 'name type size')
      .sort({ name: 1 });

    const csvHeader = 'Driver Name,Employee ID,Department,Item Name,Item Type,Item Size,Quantity,Issued Date\n';
    const csvRows = [];

    drivers.forEach(driver => {
      driver.currentlyIssuedItems.forEach(item => {
        csvRows.push(
          `"${driver.name}","${driver.employeeId}","${driver.department || ''}","${item.item?.name || ''}","${item.item?.type || ''}","${item.item?.size || ''}",${item.quantity},"${item.issuedDate ? item.issuedDate.toISOString().split('T')[0] : ''}"`
        );
      });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=items-per-driver.csv');
    res.send(csvHeader + csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ message: 'Error exporting items per driver report', error: error.message });
  }
});

// Export CSV - Transaction History
router.get('/export/transactions', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    let query = {};
    if (type) query.type = type;
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('driver', 'name employeeId')
      .populate('items.item', 'name')
      .populate('performedBy', 'username')
      .sort({ transactionDate: -1 });

    const csvHeader = 'Date,Type,Driver Name,Employee ID,Item,Quantity,Condition,Notes,Performed By\n';
    const csvRows = [];

    transactions.forEach(t => {
      t.items.forEach(item => {
        csvRows.push(
          `"${t.transactionDate.toISOString()}","${t.type}","${t.driver?.name || ''}","${t.driver?.employeeId || ''}","${item.item?.name || item.itemName}",${item.quantity},"${item.condition}","${t.notes || ''}","${t.performedBy?.username || ''}"`
        );
      });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transaction-history.csv');
    res.send(csvHeader + csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ message: 'Error exporting transaction history', error: error.message });
  }
});

// Low stock alerts
router.get('/low-stock-alerts', authenticate, async (req, res) => {
  try {
    const items = await PPEItem.find({ isActive: true });
    const lowStockItems = items.filter(item => item.isLowStock);

    const alerts = lowStockItems.map(item => ({
      id: item._id,
      name: item.name,
      type: item.type,
      currentQuantity: item.quantity,
      threshold: item.lowStockThreshold,
      deficit: item.lowStockThreshold - item.quantity
    }));

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching low stock alerts', error: error.message });
  }
});

module.exports = router;
