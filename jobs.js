// routes/jobs.js
const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const emailService = require('../services/emailService');

const BUDAPEST_DISTRICTS = Job.BUDAPEST_DISTRICTS;

router.get('/districts', (req, res) => {
  res.json({ success: true, districts: BUDAPEST_DISTRICTS });
});

router.post('/', protect, async (req, res) => {
  try {
    const { district, street, houseNumber, category, description, urgency } = req.body;

    if (!district || !BUDAPEST_DISTRICTS.includes(district)) {
      return res.status(400).json({ error: 'Érvénytelen kerület' });
    }
    if (!street || street.trim().length < 2) {
      return res.status(400).json({ error: 'Az utca megadása kötelező' });
    }
    if (!['water', 'electric', 'heating', 'locksmith'].includes(category)) {
      return res.status(400).json({ error: 'Érvénytelen kategória' });
    }
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ error: 'A leírás legalább 10 karakter legyen' });
    }

    const job = new Job({
      clientId: req.user._id,
      clientName: req.user.name,
      clientEmail: req.user.email,
      clientPhone: req.user.phone,
      district,
      street: street.trim(),
      houseNumber: houseNumber?.trim(),
      category,
      description: description.trim(),
      urgency: urgency || 'normal',
      status: 'new'
    });

    await job.save();

    const mechanics = await User.findMechanicsForJob(district, category);
    const notifiedMechanics = [];

    for (const mechanic of mechanics) {
      try {
        const result = await emailService.sendNewJobNotification(mechanic, job);
        notifiedMechanics.push({
          oderId: mechanic._id,
          name: mechanic.name,
          notifiedAt: new Date(),
          emailSent: result.success
        });
      } catch (err) {
        console.error(`Email hiba (${mechanic.email}):`, err.message);
      }
    }

    job.notifiedMechanics = notifiedMechanics;
    job.notificationCount = notifiedMechanics.length;
    if (notifiedMechanics.length > 0) job.status = 'notified';
    await job.save();

    res.status(201).json({
      success: true,
      message: 'Munka létrehozva!',
      job,
      notifiedMechanicsCount: notifiedMechanics.length
    });

  } catch (error) {
    console.error('Job creation error:', error);
    res.status(500).json({ error: 'Hiba a munka létrehozásakor' });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const { status, category, district, page = 1, limit = 20 } = req.query;
    let query = {};

    if (req.user.role === 'client') {
      query.clientId = req.user._id;
    } else if (req.user.role === 'mechanic') {
      query.$or = [
        { mechanicId: req.user._id },
        { 
          district: { $in: req.user.areas || [] },
          category: { $in: req.user.categories || [] },
          status: { $in: ['new', 'notified'] }
        }
      ];
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (district && req.user.role === 'admin') query.district = district;

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(query);

    res.json({ success: true, jobs, pagination: { page: parseInt(page), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.get('/available', protect, restrictTo('mechanic'), async (req, res) => {
  try {
    const jobs = await Job.find({
      district: { $in: req.user.areas || [] },
      category: { $in: req.user.categories || [] },
      status: { $in: ['new', 'notified'] },
      mechanicId: { $exists: false }
    }).sort({ createdAt: -1 });

    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.get('/my-jobs', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'mechanic') query.mechanicId = req.user._id;
    else if (req.user.role === 'client') query.clientId = req.user._id;

    const jobs = await Job.find(query).sort({ createdAt: -1 });

    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.get('/:jobId', protect, async (req, res) => {
  try {
    const job = await Job.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Munka nem található' });
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.post('/:jobId/accept', protect, restrictTo('mechanic'), async (req, res) => {
  try {
    const job = await Job.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Munka nem található' });
    if (job.mechanicId) return res.status(400).json({ error: 'Már elfogadva' });

    if (!req.user.areas?.includes(job.district)) {
      return res.status(403).json({ error: 'Ez a kerület nincs a területeid között' });
    }
    if (!req.user.categories?.includes(job.category)) {
      return res.status(403).json({ error: 'Ez a kategória nincs a szakterületeid között' });
    }

    job.mechanicId = req.user._id;
    job.mechanicName = req.user.name;
    job.mechanicPhone = req.user.phone;
    job.status = 'accepted';
    job.acceptedAt = new Date();
    await job.save();

    await User.findByIdAndUpdate(req.user._id, { $inc: { activeJobs: 1 } });
    
    emailService.sendJobAcceptedNotification(job, req.user).catch(console.error);

    res.json({ success: true, message: 'Munka elfogadva!', job });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.put('/:jobId/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findOne({ jobId: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Nem található' });

    const isMechanic = job.mechanicId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isMechanic && !isAdmin) return res.status(403).json({ error: 'Nincs jogosultság' });

    const oldStatus = job.status;
    job.status = status;

    if (status === 'in_progress' && !job.startedAt) job.startedAt = new Date();
    if (status === 'completed' && !job.completedAt) {
      job.completedAt = new Date();
      await User.findByIdAndUpdate(job.mechanicId, { $inc: { activeJobs: -1, completedJobs: 1 } });
    }

    await job.save();
    res.json({ success: true, message: `${oldStatus} → ${status}`, job });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

router.post('/:jobId/review', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const job = await Job.findOne({ jobId: req.params.jobId });
    
    if (!job) return res.status(404).json({ error: 'Nem található' });
    if (job.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Csak saját munkát értékelhetsz' });
    }
    if (job.review?.rating) return res.status(400).json({ error: 'Már értékelve' });

    job.review = { rating: parseInt(rating), comment, createdAt: new Date() };
    await job.save();

    if (job.mechanicId) {
      const mechanic = await User.findById(job.mechanicId);
      if (mechanic) {
        const total = (mechanic.rating * mechanic.reviews) + parseInt(rating);
        mechanic.reviews += 1;
        mechanic.rating = parseFloat((total / mechanic.reviews).toFixed(1));
        await mechanic.save();
      }
    }

    res.json({ success: true, message: 'Köszönjük az értékelést!' });
  } catch (error) {
    res.status(500).json({ error: 'Hiba' });
  }
});

module.exports = router;
