const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Order, PPEItem } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads/orders directory exists
const ordersDir = path.join(__dirname, '../uploads/orders');
if (!fs.existsSync(ordersDir)) {
  fs.mkdirSync(ordersDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ordersDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Get all orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }
    
    const orders = await Order.find(query)
      .populate('createdBy', 'username fullName')
      .populate('receivedBy', 'username fullName')
      .populate('items.item', 'name')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get all pending quantities for all items (for inventory display)
router.get('/pending-quantities', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['pending', 'sent', 'partial'] }
    });
    
    // Build a map of itemId -> pending quantity
    const pendingMap = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const itemId = item.item.toString();
        const remaining = item.orderQuantity - (item.receivedQuantity || 0);
        if (remaining > 0) {
          pendingMap[itemId] = (pendingMap[itemId] || 0) + remaining;
        }
      });
    });
    
    res.json(pendingMap);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending quantities', error: error.message });
  }
});

// Get pending orders count for an item
router.get('/pending-for-item/:itemId', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({
      'items.item': req.params.itemId,
      status: { $in: ['pending', 'sent', 'partial'] }
    });
    
    let totalPendingQuantity = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.item.toString() === req.params.itemId) {
          totalPendingQuantity += (item.orderQuantity - item.receivedQuantity);
        }
      });
    });
    
    res.json({ pendingQuantity: totalPendingQuantity });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending orders', error: error.message });
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('createdBy', 'username fullName')
      .populate('receivedBy', 'username fullName')
      .populate('attachments.uploadedBy', 'username fullName')
      .populate('items.item', 'name photo');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Create new order
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, notes } = req.body;
    
    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }
    
    // Get current stock for each item
    const orderItems = [];
    for (const item of items) {
      const ppeItem = await PPEItem.findById(item.itemId);
      if (!ppeItem) {
        return res.status(400).json({ message: `Item not found: ${item.itemId}` });
      }
      
      orderItems.push({
        item: ppeItem._id,
        itemName: ppeItem.name,
        currentStock: ppeItem.quantity,
        orderQuantity: item.orderQuantity,
        receivedQuantity: 0,
        size: ppeItem.size,
        type: ppeItem.type
      });
    }
    
    const order = new Order({
      items: orderItems,
      notes,
      createdBy: req.user._id
    });
    
    await order.save();
    
    // Populate and return
    await order.populate('createdBy', 'username fullName');
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Order create error:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

// Receive items for an order
router.post('/:id/receive', authenticate, upload.array('documents', 10), async (req, res) => {
  try {
    // Parse items from request - could be JSON string if using FormData
    let items = req.body.items;
    if (typeof items === 'string') {
      items = JSON.parse(items);
    }
    const receivedAt = req.body.receivedAt;
    // items: [{ itemId, receivedQuantity }]
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.status === 'received' || order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order already completed or cancelled' });
    }
    
    // Update received quantities and stock
    for (const receiveItem of items) {
      const orderItem = order.items.find(i => i.item.toString() === receiveItem.itemId);
      if (orderItem && receiveItem.receivedQuantity > 0) {
        // Update order item received quantity
        orderItem.receivedQuantity += receiveItem.receivedQuantity;
        orderItem.receivedDate = receivedAt ? new Date(receivedAt) : new Date();
        
        // Update PPE item stock
        const ppeItem = await PPEItem.findById(receiveItem.itemId);
        if (ppeItem) {
          ppeItem.quantity += receiveItem.receivedQuantity;
          await ppeItem.save();
        }
      }
    }
    
    // Handle file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        order.attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: '/uploads/orders/' + file.filename,
          mimetype: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
          uploadedBy: req.user._id
        });
      }
    }
    
    // Check if all items are fully received
    const allReceived = order.items.every(item => item.receivedQuantity >= item.orderQuantity);
    const someReceived = order.items.some(item => item.receivedQuantity > 0);
    
    if (allReceived) {
      order.status = 'received';
      order.receivedAt = receivedAt ? new Date(receivedAt) : new Date();
      order.receivedBy = req.user._id;
    } else if (someReceived) {
      order.status = 'partial';
    }
    
    await order.save();
    
    // Populate and return
    await order.populate('createdBy', 'username fullName');
    await order.populate('receivedBy', 'username fullName');
    await order.populate('items.item', 'name photo');
    
    res.json(order);
  } catch (error) {
    console.error('Order receive error:', error);
    res.status(500).json({ message: 'Error receiving order', error: error.message });
  }
});

// Upload attachment
router.post('/:id/attachments', authenticate, upload.single('file'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      // Delete uploaded file if order not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    order.attachments.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    });
    
    await order.save();
    
    res.json({ message: 'File uploaded successfully', attachment: order.attachments[order.attachments.length - 1] });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading file', error: error.message });
  }
});

// Download attachment
router.get('/:id/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const attachment = order.attachments.id(req.params.attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    if (!fs.existsSync(attachment.path)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    res.download(attachment.path, attachment.originalName);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading file', error: error.message });
  }
});

// Delete attachment
router.delete('/:id/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const attachment = order.attachments.id(req.params.attachmentId);
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Delete file from disk
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }
    
    // Remove from order
    order.attachments.pull(req.params.attachmentId);
    await order.save();
    
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting attachment', error: error.message });
  }
});

// Update order status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.status = status;
    
    if (status === 'received') {
      order.receivedAt = new Date();
      order.receivedBy = req.user._id;
    }
    
    await order.save();
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// Delete order
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Delete attachment files
    if (order.attachments && order.attachments.length > 0) {
      order.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      });
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
});

module.exports = router;
