const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Google Calendar Integration Service
 * Handles calendar sync for property management events
 */
class GoogleCalendarService {
  constructor() {
    this.auth = null;
    this.calendar = null;
    this.initialized = false;
  }

  /**
   * Initialize Google Calendar API
   */
  async initialize() {
    if (this.initialized) {
      return this.calendar;
    }

    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || 
      path.join(__dirname, 'google-credentials.json');
    const tokenPath = process.env.GOOGLE_TOKEN_PATH || 
      path.join(__dirname, 'google-token.json');

    try {
      // Load credentials
      if (!fs.existsSync(credentialsPath)) {
        console.warn('Google credentials not found. Set GOOGLE_CREDENTIALS_PATH or create google-credentials.json');
        return null;
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

      // Create OAuth2 client
      this.auth = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uris[0]
      );

      // Load saved token
      if (fs.existsSync(tokenPath)) {
        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        this.auth.setCredentials(token);
      }

      // Create calendar API client
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      this.initialized = true;

      console.log('✅ Google Calendar service initialized');
      return this.calendar;
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar:', error.message);
      return null;
    }
  }

  /**
   * Generate auth URL for OAuth flow
   */
  getAuthUrl() {
    if (!this.auth) {
      throw new Error('Calendar service not initialized');
    }

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar']
    });
  }

  /**
   * Save OAuth token after authorization
   */
  async saveToken(code) {
    const tokenPath = process.env.GOOGLE_TOKEN_PATH || 
      path.join(__dirname, 'google-token.json');

    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);

    // Save token for future use
    fs.writeFileSync(tokenPath, JSON.stringify(tokens));
    
    // Initialize calendar with new token
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
    this.initialized = true;

    return tokens;
  }

  /**
   * Create calendar event
   */
  async createEvent(eventData) {
    const cal = await this.initialize();
    if (!cal) {
      throw new Error('Google Calendar not configured');
    }

    const event = {
      summary: eventData.summary,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventData.startDateTime,
        timeZone: eventData.timeZone || 'America/New_York'
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: eventData.timeZone || 'America/New_York'
      },
      reminders: {
        useDefault: false,
        overrides: eventData.reminders || [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 }
        ]
      },
      attendees: eventData.attendees || []
    };

    const response = await cal.events.insert({
      calendarId: eventData.calendarId || 'primary',
      requestBody: event
    });

    console.log(`📅 Event created: ${response.data.htmlLink}`);
    return response.data;
  }

  /**
   * Update calendar event
   */
  async updateEvent(eventId, eventData) {
    const cal = await this.initialize();
    if (!cal) {
      throw new Error('Google Calendar not configured');
    }

    const event = await cal.events.get({
      calendarId: eventData.calendarId || 'primary',
      eventId: eventId
    });

    // Merge updates
    const updatedEvent = {
      ...event.data,
      summary: eventData.summary || event.data.summary,
      description: eventData.description || event.data.description,
      location: eventData.location || event.data.location
    };

    if (eventData.startDateTime) {
      updatedEvent.start = {
        dateTime: eventData.startDateTime,
        timeZone: eventData.timeZone || 'America/New_York'
      };
    }

    if (eventData.endDateTime) {
      updatedEvent.end = {
        dateTime: eventData.endDateTime,
        timeZone: eventData.timeZone || 'America/New_York'
      };
    }

    const response = await cal.events.update({
      calendarId: eventData.calendarId || 'primary',
      eventId: eventId,
      requestBody: updatedEvent
    });

    console.log(`📅 Event updated: ${response.data.htmlLink}`);
    return response.data;
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(eventId, calendarId = 'primary') {
    const cal = await this.initialize();
    if (!cal) {
      throw new Error('Google Calendar not configured');
    }

    await cal.events.delete({
      calendarId,
      eventId
    });

    console.log(`🗑️ Event deleted: ${eventId}`);
  }

  /**
   * Get events for date range
   */
  async getEvents(timeMin, timeMax, calendarId = 'primary') {
    const cal = await this.initialize();
    if (!cal) {
      throw new Error('Google Calendar not configured');
    }

    const response = await cal.events.list({
      calendarId,
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(days = 7, calendarId = 'primary') {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.getEvents(now, future, calendarId);
  }

  /**
   * Create rent due reminder event
   */
  async createRentDueReminder({ tenantName, propertyAddress, amount, dueDate }) {
    const event = {
      summary: `💰 Rent Due - ${tenantName}`,
      description: `Monthly rent payment of $${amount} is due for ${propertyAddress}`,
      startDateTime: new Date(dueDate).toISOString(),
      endDateTime: new Date(new Date(dueDate).setHours(23, 59, 59)).toISOString(),
      reminders: [
        { method: 'email', minutes: 1440 }, // 1 day before
        { method: 'popup', minutes: 60 }    // 1 hour before
      ]
    };

    return this.createEvent(event);
  }

  /**
   * Create maintenance appointment event
   */
  async createMaintenanceEvent({ propertyAddress, description, scheduledDate, technician }) {
    const event = {
      summary: `🔧 Maintenance - ${propertyAddress}`,
      description: `${description}\nTechnician: ${technician || 'TBD'}`,
      location: propertyAddress,
      startDateTime: new Date(scheduledDate).toISOString(),
      endDateTime: new Date(new Date(scheduledDate).setHours(
        new Date(scheduledDate).getHours() + 2
      )).toISOString(),
      reminders: [
        { method: 'email', minutes: 120 },
        { method: 'popup', minutes: 30 }
      ]
    };

    return this.createEvent(event);
  }

  /**
   * Create property showing event
   */
  async createShowingEvent({ propertyAddress, clientName, scheduledDate }) {
    const event = {
      summary: `🏠 Property Showing - ${propertyAddress}`,
      description: `Showing with ${clientName || 'Prospective Tenant'}`,
      location: propertyAddress,
      startDateTime: new Date(scheduledDate).toISOString(),
      endDateTime: new Date(new Date(scheduledDate).setHours(
        new Date(scheduledDate).getHours() + 1
      )).toISOString(),
      reminders: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 }
      ]
    };

    return this.createEvent(event);
  }

  /**
   * Sync lease events to calendar
   */
  async syncLeaseEvents(lease) {
    const events = [];

    // Create rent due reminders for next 12 months
    for (let i = 0; i < 12; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDate.setDate(lease.rentDueDay || 1);

      const event = await this.createRentDueReminder({
        tenantName: lease.tenantName,
        propertyAddress: lease.propertyAddress,
        amount: lease.monthlyRent,
        dueDate
      });

      events.push(event);
    }

    console.log(`📅 Created ${events.length} rent reminder events`);
    return events;
  }
}

module.exports = new GoogleCalendarService();
