const express = require('express');
const QRCode = require('qrcode');
const { PPEItem } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all PPE items
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, lowStock, type, size, isActive } = req.query;
    
    let query = {};
    
    // Default to active items only (unless explicitly requested otherwise)
    if (isActive === undefined) {
      query.isActive = true;
    } else if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }
    
    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by type
    if (type) {
      query.type = type;
    }
    
    // Filter by size
    if (size) {
      query.size = size;
    }
    
    let items = await PPEItem.find(query).sort({ name: 1 });
    
    // Filter low stock items after fetching (since it's a virtual)
    if (lowStock === 'true') {
      items = items.filter(item => item.isLowStock);
    }
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
});

// Get low stock items count
router.get('/low-stock-count', authenticate, async (req, res) => {
  try {
    const items = await PPEItem.find({ isActive: true });
    const lowStockCount = items.filter(item => item.isLowStock).length;
    res.json({ count: lowStockCount });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching low stock count', error: error.message });
  }
});

// Get single PPE item
router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await PPEItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching item', error: error.message });
  }
});

// Get item by barcode
router.get('/barcode/:barcode', authenticate, async (req, res) => {
  try {
    const item = await PPEItem.findOne({ barcode: req.params.barcode });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching item', error: error.message });
  }
});

// Create new PPE item
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      name,
      description,
      photo,
      quantity,
      lowStockThreshold,
      size,
      type,
      expiryDate,
      customFields,
      barcode
    } = req.body;

    // Generate barcode if not provided
    const finalBarcode = barcode || `PPE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(finalBarcode);

    const item = new PPEItem({
      name,
      description,
      photo,
      quantity,
      lowStockThreshold,
      size,
      type,
      expiryDate,
      customFields,
      barcode: finalBarcode,
      qrCode
    });

    await item.save();
    res.status(201).json(item);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Barcode already exists' });
    }
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

// Update PPE item
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      name,
      description,
      photo,
      quantity,
      lowStockThreshold,
      size,
      type,
      expiryDate,
      customFields,
      barcode,
      isActive
    } = req.body;

    const item = await PPEItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Update fields
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (photo !== undefined) item.photo = photo;
    if (quantity !== undefined) item.quantity = quantity;
    if (lowStockThreshold !== undefined) item.lowStockThreshold = lowStockThreshold;
    if (size !== undefined) item.size = size;
    if (type !== undefined) item.type = type;
    if (expiryDate !== undefined) item.expiryDate = expiryDate;
    if (customFields !== undefined) item.customFields = customFields;
    if (isActive !== undefined) item.isActive = isActive;
    
    // Update barcode and regenerate QR if changed
    if (barcode && barcode !== item.barcode) {
      item.barcode = barcode;
      item.qrCode = await QRCode.toDataURL(barcode);
    }

    await item.save();
    res.json(item);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Barcode already exists' });
    }
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
});

// Delete PPE item (soft delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const item = await PPEItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.isActive = false;
    await item.save();
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
});

// Regenerate QR code
router.post('/:id/regenerate-qr', authenticate, async (req, res) => {
  try {
    const item = await PPEItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.qrCode = await QRCode.toDataURL(item.barcode);
    await item.save();
    
    res.json({ qrCode: item.qrCode });
  } catch (error) {
    res.status(500).json({ message: 'Error regenerating QR code', error: error.message });
  }
});

// Bulk update quantities (for inventory adjustments)
router.post('/bulk-adjust', authenticate, async (req, res) => {
  try {
    const { adjustments } = req.body; // Array of { itemId, adjustment } where adjustment can be + or -

    const results = [];
    for (const adj of adjustments) {
      const item = await PPEItem.findById(adj.itemId);
      if (item) {
        item.quantity = Math.max(0, item.quantity + adj.adjustment);
        await item.save();
        results.push({ itemId: adj.itemId, newQuantity: item.quantity });
      }
    }

    res.json({ message: 'Bulk adjustment completed', results });
  } catch (error) {
    res.status(500).json({ message: 'Error performing bulk adjustment', error: error.message });
  }
});

module.exports = router;
