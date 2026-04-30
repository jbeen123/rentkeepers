const express = require('express');
const router = express.Router();
const icsService = require('./ics-calendar-service');
const path = require('path');
const fs = require('fs');

/**
 * GET /api/ics/health
 * Check if ICS service is working
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ICS Calendar Service is ready',
    features: [
      'Rent reminders',
      'Maintenance appointments',
      'Property showings',
      'Lease events',
      'Recurring events'
    ]
  });
});

/**
 * POST /api/ics/rent-reminder
 * Generate rent due reminder ICS file
 */
router.post('/rent-reminder', (req, res) => {
  try {
    const { tenantName, propertyAddress, amount, dueDate } = req.body;

    if (!tenantName || !amount || !dueDate) {
      return res.status(400).json({
        error: 'Missing required fields: tenantName, amount, dueDate'
      });
    }

    const event = icsService.createRentReminder({
      tenantName,
      propertyAddress: propertyAddress || '',
      amount: parseFloat(amount),
      dueDate
    });

    const icsContent = icsService.generateICS(event);
    const filename = `rent-reminder-${tenantName.replace(/\s+/g, '-')}-${new Date(dueDate).toISOString().split('T')[0]}.ics`;

    // Option 1: Send as download
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ics/maintenance
 * Generate maintenance appointment ICS file
 */
router.post('/maintenance', (req, res) => {
  try {
    const { propertyAddress, description, scheduledDate, technician } = req.body;

    if (!propertyAddress || !scheduledDate) {
      return res.status(400).json({
        error: 'Missing required fields: propertyAddress, scheduledDate'
      });
    }

    const event = icsService.createMaintenanceEvent({
      propertyAddress,
      description,
      scheduledDate,
      technician
    });

    const icsContent = icsService.generateICS(event);
    const filename = `maintenance-${propertyAddress.replace(/\s+/g, '-')}-${new Date(scheduledDate).toISOString().split('T')[0]}.ics`;

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ics/showing
 * Generate property showing ICS file
 */
router.post('/showing', (req, res) => {
  try {
    const { propertyAddress, clientName, scheduledDate } = req.body;

    if (!propertyAddress || !scheduledDate) {
      return res.status(400).json({
        error: 'Missing required fields: propertyAddress, scheduledDate'
      });
    }

    const event = icsService.createShowingEvent({
      propertyAddress,
      clientName,
      scheduledDate
    });

    const icsContent = icsService.generateICS(event);
    const filename = `showing-${propertyAddress.replace(/\s+/g, '-')}-${new Date(scheduledDate).toISOString().split('T')[0]}.ics`;

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ics/lease-event
 * Generate lease event (move-in/move-out/inspection) ICS file
 */
router.post('/lease-event', (req, res) => {
  try {
    const { tenantName, propertyAddress, type, date } = req.body;

    if (!tenantName || !propertyAddress || !type || !date) {
      return res.status(400).json({
        error: 'Missing required fields: tenantName, propertyAddress, type, date'
      });
    }

    const event = icsService.createLeaseEvent({
      tenantName,
      propertyAddress,
      type,
      date
    });

    const icsContent = icsService.generateICS(event);
    const filename = `lease-${type}-${tenantName.replace(/\s+/g, '-')}-${new Date(date).toISOString().split('T')[0]}.ics`;

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ics/recurring-rent
 * Generate multiple rent reminders (for entire year)
 */
router.post('/recurring-rent', (req, res) => {
  try {
    const { tenantName, propertyAddress, amount, startDate, months = 12 } = req.body;

    if (!tenantName || !amount || !startDate) {
      return res.status(400).json({
        error: 'Missing required fields: tenantName, amount, startDate'
      });
    }

    const events = icsService.createRecurringRentReminders({
      tenantName,
      propertyAddress: propertyAddress || '',
      amount: parseFloat(amount),
      startDate,
      months
    });

    // Generate multiple ICS files or a combined calendar
    const icsContents = events.map(event => icsService.generateICS(event));
    
    // Return as JSON with all events
    res.json({
      success: true,
      message: `Generated ${months} rent reminder events`,
      events: events.map((event, i) => ({
        summary: event.summary,
        date: event.startDateTime.toISOString(),
        icsContent: icsContents[i]
      }))
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ics/generate
 * Generate ICS from query parameters (for easy links)
 */
router.get('/generate', (req, res) => {
  try {
    const {
      type = 'rent',
      tenantName,
      propertyAddress,
      amount,
      date,
      scheduledDate
    } = req.query;

    let event;

    switch (type) {
      case 'rent':
        event = icsService.createRentReminder({
          tenantName,
          propertyAddress,
          amount: parseFloat(amount),
          dueDate: date
        });
        break;
      case 'maintenance':
        event = icsService.createMaintenanceEvent({
          propertyAddress,
          description: req.query.description,
          scheduledDate: scheduledDate || date,
          technician: req.query.technician
        });
        break;
      case 'showing':
        event = icsService.createShowingEvent({
          propertyAddress,
          clientName: req.query.clientName,
          scheduledDate: scheduledDate || date
        });
        break;
      default:
        throw new Error('Invalid event type');
    }

    const icsContent = icsService.generateICS(event);
    const filename = `${type}-${Date.now()}.ics`;

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ics/sample
 * Generate sample ICS file for testing
 */
router.get('/sample', (req, res) => {
  const event = {
    summary: '🏠 RentKeepers Test Event',
    description: 'This is a test event from the ICS Calendar Service\n\nNo API credentials required!',
    location: '123 Test Street',
    startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    alarmMinutes: 60
  };

  const icsContent = icsService.generateICS(event);

  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', 'attachment; filename="test-event.ics"');
  res.send(icsContent);
});

/**
 * POST /api/ics/email
 * Generate ICS and prepare for email attachment
 */
router.post('/email', (req, res) => {
  try {
    const { eventType, eventData, emailOptions } = req.body;

    let event;
    switch (eventType) {
      case 'rent':
        event = icsService.createRentReminder(eventData);
        break;
      case 'maintenance':
        event = icsService.createMaintenanceEvent(eventData);
        break;
      case 'showing':
        event = icsService.createShowingEvent(eventData);
        break;
      default:
        throw new Error('Invalid event type');
    }

    const icsContent = icsService.generateICS(event);
    const filename = `${eventType}-${Date.now()}.ics`;

    // Return ICS content ready for email attachment
    res.json({
      success: true,
      icsContent,
      filename,
      mimeType: 'text/calendar',
      emailReady: {
        subject: `Calendar Event: ${event.summary}`,
        attachment: {
          filename,
          content: icsContent,
          contentType: 'text/calendar'
        }
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
