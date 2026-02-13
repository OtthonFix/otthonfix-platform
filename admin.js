// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Job = require('../models/Job');
const Invoice = require('../models/Invoice');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin'));

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalUsers, totalMechanics, totalClients, onlineMechanics] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'mechanic' }),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'mechanic', online: true })
    ]);

    const [totalJobs, newJobs, activeJobs, completedJobs, todayJobs] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: { $in: ['new', 'notified'] } }),
      Job.countDocuments({ status: { $in: ['accepted', 'in_progress'] } }),
      Job.countDocuments({ status: { $in: ['completed', 'invoiced', 'paid'] } }),
      Job.countDocuments({ createdAt: { $gte: today } })
    ]);

    const revenue = await Invoice.aggregate([
      { $match: { status: { $in: ['approved', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$grossAmount' }, commission: { $sum: '$commissionAmount' } } }
    ]);

    const pendingInvoices = await Invoice.countDocuments({ status: 'pending' });

    const recentJobs = await Job.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('jobId clientName district category categoryName status createdAt mechanicName');

    const topMechanics = await User.find({ role: 'mechanic' })
      .sort({ completedJobs: -1, rating: -1 })
      .limit(5)
      .select('name rating reviews completedJobs totalEarnings avatar');

    const byDistrict = await Job.aggregate([
      { $group: { _id: '$district', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const byCategory = await Job.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      dashboard: {
        users: { total: totalUsers, mechanics: totalMechanics, clients: totalClients, online: onlineMechanics },
        jobs: { total: totalJobs, new: newJobs, active: activeJobs, completed: completedJobs, today: todayJobs },
        revenue: { total: revenue[0]?.total || 0, commission: revenue[0]?.commission || 0 },
        pendingInvoices,
        recentJobs,
        topMechanics,
        byDistrict,
        byCategory
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = {};

    if (role && role !== 'all') query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Nem található' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: user.isActive ? 'Aktiválva' : 'Deaktiválva', isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const { status, category, district, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (district) query.district = district;
    if (search) {
      query.$or = [
        { jobId: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { mechanicName: { $regex: search, $options: 'i' } }
      ];
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.put('/jobs/:jobId/assign', async (req, res) => {
  try {
    const { mechanicId } = req.body;
    const job = await Job.findOne({ jobId: req.params.jobId });
    const mechanic = await User.findById(mechanicId);

    if (!job) return res.status(404).json({ error: 'Munka nem található' });
    if (!mechanic || mechanic.role !== 'mechanic') return res.status(404).json({ error: 'Szerelő nem található' });

    job.mechanicId = mechanic._id;
    job.mechanicName = mechanic.name;
    job.mechanicPhone = mechanic.phone;
    job.status = 'accepted';
    job.acceptedAt = new Date();
    await job.save();

    await User.findByIdAndUpdate(mechanicId, { $inc: { activeJobs: 1 } });

    res.json({ success: true, message: `Kiosztva: ${mechanic.name}`, job });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

module.exports = router;
