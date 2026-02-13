// routes/invoices.js
const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Job = require('../models/Job');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/', protect, restrictTo('mechanic'), async (req, res) => {
  try {
    const { jobId, grossAmount, fileUrl, fileName } = req.body;

    if (!jobId || !grossAmount || !fileUrl) {
      return res.status(400).json({ error: 'Hiányzó adatok' });
    }

    const job = await Job.findOne({ jobId });
    if (!job) return res.status(404).json({ error: 'Munka nem található' });

    if (job.mechanicId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Csak saját munkához tölthetsz fel' });
    }

    const invoice = new Invoice({
      jobId: job.jobId,
      job: job._id,
      mechanicId: req.user._id,
      mechanicName: req.user.name,
      clientId: job.clientId,
      clientName: job.clientName,
      grossAmount,
      fileUrl,
      fileName: fileName || 'szamla.pdf'
    });

    await invoice.save();

    job.status = 'invoiced';
    job.invoiceUrl = fileUrl;
    job.finalPrice = grossAmount;
    job.commissionAmount = invoice.commissionAmount;
    await job.save();

    res.status(201).json({ success: true, message: 'Számla feltöltve!', invoice });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'mechanic') query.mechanicId = req.user._id;

    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.get('/my-stats', protect, restrictTo('mechanic'), async (req, res) => {
  try {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [allTime, monthly] = await Promise.all([
      Invoice.aggregate([
        { $match: { mechanicId: req.user._id, status: { $in: ['approved', 'paid'] } } },
        { $group: { _id: null, gross: { $sum: '$grossAmount' }, net: { $sum: '$netAmount' }, count: { $sum: 1 } } }
      ]),
      Invoice.aggregate([
        { $match: { mechanicId: req.user._id, createdAt: { $gte: thisMonth } } },
        { $group: { _id: null, gross: { $sum: '$grossAmount' }, count: { $sum: 1 } } }
      ])
    ]);

    const pending = await Invoice.find({ mechanicId: req.user._id, status: 'pending' });
    const pendingAmount = pending.reduce((sum, inv) => sum + inv.netAmount, 0);

    res.json({
      success: true,
      stats: {
        allTime: { gross: allTime[0]?.gross || 0, net: allTime[0]?.net || 0, count: allTime[0]?.count || 0 },
        thisMonth: { gross: monthly[0]?.gross || 0, count: monthly[0]?.count || 0 },
        pending: { amount: pendingAmount, count: pending.length }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.put('/:invoiceId/approve', protect, restrictTo('admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoiceId: req.params.invoiceId });
    if (!invoice) return res.status(404).json({ error: 'Nem található' });

    invoice.status = 'approved';
    invoice.reviewedBy = req.user._id;
    invoice.reviewedAt = new Date();
    await invoice.save();

    await User.findByIdAndUpdate(invoice.mechanicId, { $inc: { pendingPayout: invoice.netAmount } });

    res.json({ success: true, message: 'Jóváhagyva!', invoice });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.put('/:invoiceId/reject', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const invoice = await Invoice.findOne({ invoiceId: req.params.invoiceId });
    if (!invoice) return res.status(404).json({ error: 'Nem található' });

    invoice.status = 'rejected';
    invoice.reviewedBy = req.user._id;
    invoice.reviewedAt = new Date();
    invoice.rejectionReason = reason || 'Nem megfelelő';
    await invoice.save();

    res.json({ success: true, message: 'Elutasítva', invoice });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.put('/:invoiceId/pay', protect, restrictTo('admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoiceId: req.params.invoiceId });
    if (!invoice) return res.status(404).json({ error: 'Nem található' });
    if (invoice.status !== 'approved') return res.status(400).json({ error: 'Csak jóváhagyottat lehet' });

    invoice.status = 'paid';
    invoice.isPaid = true;
    invoice.paidAt = new Date();
    await invoice.save();

    await User.findByIdAndUpdate(invoice.mechanicId, {
      $inc: { pendingPayout: -invoice.netAmount, totalEarnings: invoice.netAmount }
    });

    await Job.findOneAndUpdate({ jobId: invoice.jobId }, { status: 'paid', isPaid: true });

    res.json({ success: true, message: 'Kifizetve!', invoice });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

module.exports = router;
