const express = require('express');
const { Transaction, PPEItem, Driver } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Issue PPE items to driver
router.post('/issue', authenticate, async (req, res) => {
  try {
    const { driverId, items, notes } = req.body;
    // items: [{ itemId, quantity, condition, earlyIssueReason, earlyIssueNote }]

    // Validate driver
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (!driver.isActive) {
      return res.status(400).json({ message: 'Cannot issue to inactive driver' });
    }

    // Validate and update items
    const transactionItems = [];
    const lowStockAlerts = [];

    for (const item of items) {
      const ppeItem = await PPEItem.findById(item.itemId);
      if (!ppeItem) {
        return res.status(404).json({ message: `Item not found: ${item.itemId}` });
      }

      if (!ppeItem.isActive) {
        return res.status(400).json({ message: `Item is inactive: ${ppeItem.name}` });
      }

      if (ppeItem.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${ppeItem.name}. Available: ${ppeItem.quantity}` 
        });
      }

      // Deduct from stock
      ppeItem.quantity -= item.quantity;
      await ppeItem.save();

      // Check for low stock
      if (ppeItem.isLowStock) {
        lowStockAlerts.push({
          itemId: ppeItem._id,
          name: ppeItem.name,
          currentQuantity: ppeItem.quantity,
          threshold: ppeItem.lowStockThreshold
        });
      }

      transactionItems.push({
        item: ppeItem._id,
        itemName: ppeItem.name,
        quantity: item.quantity,
        condition: item.condition || 'new',
        earlyIssueReason: item.earlyIssueReason || null,
        earlyIssueNote: item.earlyIssueNote || ''
      });
    }

    // Create transaction
    const transaction = new Transaction({
      type: 'issue',
      driver: driverId,
      items: transactionItems,
      notes,
      performedBy: req.user._id
    });

    await transaction.save();

    // Update driver's currently issued items
    for (const item of transactionItems) {
      const existingIndex = driver.currentlyIssuedItems.findIndex(
        i => i.item.toString() === item.item.toString()
      );

      if (existingIndex >= 0) {
        // Update existing - reset issued date for tracking usage period
        driver.currentlyIssuedItems[existingIndex].quantity += item.quantity;
        driver.currentlyIssuedItems[existingIndex].issuedDate = new Date();
        driver.currentlyIssuedItems[existingIndex].transactionId = transaction._id;
      } else {
        driver.currentlyIssuedItems.push({
          item: item.item,
          quantity: item.quantity,
          issuedDate: new Date(),
          transactionId: transaction._id
        });
      }
    }

    await driver.save();

    // Populate and return
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('driver', 'name employeeId')
      .populate('items.item', 'name photo')
      .populate('performedBy', 'username');

    res.status(201).json({
      transaction: populatedTransaction,
      lowStockAlerts: lowStockAlerts.length > 0 ? lowStockAlerts : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Error issuing items', error: error.message });
  }
});

// Return PPE items from driver
router.post('/return', authenticate, async (req, res) => {
  try {
    const { driverId, items, notes, originalTransactionId } = req.body;
    // items: [{ itemId, quantity, condition }]

    // Validate driver
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Validate and update items
    const transactionItems = [];

    for (const item of items) {
      const ppeItem = await PPEItem.findById(item.itemId);
      if (!ppeItem) {
        return res.status(404).json({ message: `Item not found: ${item.itemId}` });
      }

      // Check if driver has this item
      const issuedItem = driver.currentlyIssuedItems.find(
        i => i.item.toString() === item.itemId
      );

      if (!issuedItem || issuedItem.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Driver doesn't have enough ${ppeItem.name} to return. Has: ${issuedItem?.quantity || 0}` 
        });
      }

      // Add back to stock (unless damaged)
      if (item.condition !== 'damaged') {
        ppeItem.quantity += item.quantity;
        await ppeItem.save();
      }

      transactionItems.push({
        item: ppeItem._id,
        itemName: ppeItem.name,
        quantity: item.quantity,
        condition: item.condition || 'good'
      });
    }

    // Create transaction
    const transaction = new Transaction({
      type: 'return',
      driver: driverId,
      items: transactionItems,
      notes,
      originalTransaction: originalTransactionId,
      performedBy: req.user._id
    });

    await transaction.save();

    // Update driver's currently issued items
    for (const item of transactionItems) {
      const existingIndex = driver.currentlyIssuedItems.findIndex(
        i => i.item.toString() === item.item.toString()
      );

      if (existingIndex >= 0) {
        driver.currentlyIssuedItems[existingIndex].quantity -= item.quantity;
        
        // Remove if quantity is 0
        if (driver.currentlyIssuedItems[existingIndex].quantity <= 0) {
          driver.currentlyIssuedItems.splice(existingIndex, 1);
        }
      }
    }

    await driver.save();

    // Populate and return
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('driver', 'name employeeId')
      .populate('items.item', 'name photo')
      .populate('performedBy', 'username');

    res.status(201).json({ transaction: populatedTransaction });
  } catch (error) {
    res.status(500).json({ message: 'Error returning items', error: error.message });
  }
});

// Get all transactions with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      type, 
      driverId, 
      itemId, 
      startDate, 
      endDate, 
      limit = 50, 
      skip = 0 
    } = req.query;

    let query = {};

    if (type) {
      query.type = type;
    }

    if (driverId) {
      query.driver = driverId;
    }

    if (itemId) {
      query['items.item'] = itemId;
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
      .populate('driver', 'name employeeId photo')
      .populate('items.item', 'name photo barcode')
      .populate('performedBy', 'username')
      .sort({ transactionDate: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({ transactions, total });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
});

// Get single transaction
router.get('/:id', authenticate, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('driver', 'name employeeId photo')
      .populate('items.item', 'name photo barcode')
      .populate('performedBy', 'username')
      .populate('originalTransaction');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transaction', error: error.message });
  }
});

module.exports = router;
