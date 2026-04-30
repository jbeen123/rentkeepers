const express = require('express');
const router = express.Router();
const calendarService = require('./google-calendar-service');

/**
 * GET /api/calendar/auth-url
 * Get Google OAuth authorization URL
 */
router.get('/auth-url', async (req, res) => {
  try {
    const authUrl = calendarService.getAuthUrl();
    res.json({
      success: true,
      authUrl,
      message: 'Visit this URL to authorize Google Calendar access'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendar/authorize
 * Save OAuth token after authorization
 */
router.post('/authorize', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const tokens = await calendarService.saveToken(code);
    res.json({
      success: true,
      message: 'Google Calendar authorized successfully',
      tokens: {
        expiry_date: tokens.expiry_date
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calendar/events
 * Get calendar events for date range
 */
router.get('/events', async (req, res) => {
  try {
    const { start, end, days } = req.query;

    let events;
    if (days) {
      events = await calendarService.getUpcomingEvents(parseInt(days));
    } else {
      const timeMin = start || new Date().toISOString();
      const timeMax = end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      events = await calendarService.getEvents(timeMin, timeMax);
    }

    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        htmlLink: event.htmlLink,
        attendees: event.attendees || []
      })),
      total: events.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendar/events
 * Create new calendar event
 */
router.post('/events', async (req, res) => {
  try {
    const eventData = req.body;

    // Validate required fields
    if (!eventData.summary || !eventData.startDateTime || !eventData.endDateTime) {
      return res.status(400).json({
        error: 'Missing required fields: summary, startDateTime, endDateTime'
      });
    }

    const event = await calendarService.createEvent(eventData);
    res.json({
      success: true,
      message: 'Event created successfully',
      event: {
        id: event.id,
        summary: event.summary,
        htmlLink: event.htmlLink
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/calendar/events/:id
 * Update existing event
 */
router.put('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventData = req.body;

    const event = await calendarService.updateEvent(eventId, eventData);
    res.json({
      success: true,
      message: 'Event updated successfully',
      event: {
        id: event.id,
        summary: event.summary,
        htmlLink: event.htmlLink
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/calendar/events/:id
 * Delete event
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { calendarId } = req.query;

    await calendarService.deleteEvent(eventId, calendarId);
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendar/events/rent-reminder
 * Create rent due reminder
 */
router.post('/events/rent-reminder', async (req, res) => {
  try {
    const { tenantName, propertyAddress, amount, dueDate } = req.body;

    if (!tenantName || !amount || !dueDate) {
      return res.status(400).json({
        error: 'Missing required fields: tenantName, amount, dueDate'
      });
    }

    const event = await calendarService.createRentDueReminder({
      tenantName,
      propertyAddress,
      amount,
      dueDate
    });

    res.json({
      success: true,
      message: 'Rent reminder created',
      event: {
        id: event.id,
        summary: event.summary,
        htmlLink: event.htmlLink
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendar/events/maintenance
 * Create maintenance appointment
 */
router.post('/events/maintenance', async (req, res) => {
  try {
    const { propertyAddress, description, scheduledDate, technician } = req.body;

    if (!propertyAddress || !scheduledDate) {
      return res.status(400).json({
        error: 'Missing required fields: propertyAddress, scheduledDate'
      });
    }

    const event = await calendarService.createMaintenanceEvent({
      propertyAddress,
      description,
      scheduledDate,
      technician
    });

    res.json({
      success: true,
      message: 'Maintenance appointment created',
      event: {
        id: event.id,
        summary: event.summary,
        htmlLink: event.htmlLink
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/calendar/events/showing
 * Create property showing event
 */
router.post('/events/showing', async (req, res) => {
  try {
    const { propertyAddress, clientName, scheduledDate } = req.body;

    if (!propertyAddress || !scheduledDate) {
      return res.status(400).json({
        error: 'Missing required fields: propertyAddress, scheduledDate'
      });
    }

    const event = await calendarService.createShowingEvent({
      propertyAddress,
      clientName,
      scheduledDate
    });

    res.json({
      success: true,
      message: 'Showing scheduled',
      event: {
        id: event.id,
        summary: event.summary,
        htmlLink: event.htmlLink
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/calendar/status
 * Check calendar connection status
 */
router.get('/status', async (req, res) => {
  try {
    const cal = await calendarService.initialize();
    
    if (!cal) {
      return res.json({
        connected: false,
        message: 'Google Calendar not configured'
      });
    }

    // Test connection by getting upcoming events
    const events = await calendarService.getUpcomingEvents(1);
    
    res.json({
      connected: true,
      message: 'Google Calendar connected',
      upcomingEvents: events.length
    });
  } catch (error) {
    res.json({
      connected: false,
      message: error.message
    });
  }
});

module.exports = router;
