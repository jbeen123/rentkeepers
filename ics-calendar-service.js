/**
 * ICS/iCal Calendar Generator Service
 * Generates .ics files compatible with all calendar apps
 * (Google Calendar, Apple Calendar, Outlook, etc.)
 * 
 * No API credentials required!
 */

/**
 * Format date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date, timezone = 'America/New_York') {
  const d = new Date(date);
  // For simplicity, using UTC format
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape text for ICS format
 */
function escapeICSText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate ICS calendar file content
 */
function generateICS(event) {
  const {
    summary,
    description,
    location,
    startDateTime,
    endDateTime,
    alarmMinutes = 60,
    uid = Date.now() + '@rentkeepers'
  } = event;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RentKeepers//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:RentKeepers',
    'X-WR-TIMEZONE:America/New_York',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDateTime)}`,
    `DTEND:${formatICSDate(endDateTime)}`,
    `SUMMARY:${escapeICSText(summary)}`,
    `DESCRIPTION:${escapeICSText(description || '')}`,
    `LOCATION:${escapeICSText(location || '')}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT' + alarmMinutes + 'M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${escapeICSText(summary)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

/**
 * Create rent due reminder event
 */
function createRentReminder({ tenantName, propertyAddress, amount, dueDate }) {
  return {
    summary: `💰 Rent Due - ${tenantName}`,
    description: `Monthly rent payment of $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} is due for:\n\n${propertyAddress}\n\nPlease submit your payment on time to avoid late fees.`,
    location: propertyAddress,
    startDateTime: new Date(dueDate),
    endDateTime: new Date(new Date(dueDate).setHours(23, 59, 59)),
    alarmMinutes: 1440 // 24 hours before
  };
}

/**
 * Create maintenance appointment event
 */
function createMaintenanceEvent({ propertyAddress, description, scheduledDate, technician }) {
  const startDate = new Date(scheduledDate);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

  return {
    summary: `🔧 Maintenance - ${propertyAddress}`,
    description: `${description}\n\nTechnician: ${technician || 'TBD'}\n\nPlease ensure access to the property.`,
    location: propertyAddress,
    startDateTime: startDate,
    endDateTime: endDate,
    alarmMinutes: 120 // 2 hours before
  };
}

/**
 * Create property showing event
 */
function createShowingEvent({ propertyAddress, clientName, scheduledDate }) {
  const startDate = new Date(scheduledDate);
  const endDate = new Date(startDate.getTime() + 1 * 60 * 60 * 1000); // 1 hour later

  return {
    summary: `🏠 Property Showing - ${propertyAddress}`,
    description: `Showing with ${clientName || 'Prospective Tenant'}\n\nPlease ensure the property is ready for viewing.`,
    location: propertyAddress,
    startDateTime: startDate,
    endDateTime: endDate,
    alarmMinutes: 60 // 1 hour before
  };
}

/**
 * Create lease event (move-in/move-out)
 */
function createLeaseEvent({ tenantName, propertyAddress, type, date }) {
  const startDate = new Date(date);
  const endDate = new Date(startDate.getTime() + 1 * 60 * 60 * 1000); // 1 hour later

  const eventTypes = {
    'move-in': '🏡 Move-In',
    'move-out': '📦 Move-Out',
    'inspection': '🔍 Inspection',
    'renewal': '📝 Lease Renewal'
  };

  return {
    summary: `${eventTypes[type] || 'Lease Event'} - ${tenantName}`,
    description: `${eventTypes[type] || 'Lease Event'} for:\n\n${propertyAddress}\n\nTenant: ${tenantName}`,
    location: propertyAddress,
    startDateTime: startDate,
    endDateTime: endDate,
    alarmMinutes: 1440 // 24 hours before
  };
}

/**
 * Generate recurring rent reminders for multiple months
 */
function createRecurringRentReminders({ tenantName, propertyAddress, amount, startDate, months = 12 }) {
  const events = [];
  const start = new Date(startDate);

  for (let i = 0; i < months; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(start.getMonth() + i);

    events.push(createRentReminder({
      tenantName,
      propertyAddress,
      amount,
      dueDate
    }));
  }

  return events;
}

/**
 * Save ICS content to file
 */
function saveICSFile(icsContent, filename) {
  const fs = require('fs');
  const path = require('path');

  const icsDir = path.join(__dirname, 'ics-files');
  if (!fs.existsSync(icsDir)) {
    fs.mkdirSync(icsDir, { recursive: true });
  }

  const filePath = path.join(icsDir, filename);
  fs.writeFileSync(filePath, icsContent);

  return filePath;
}

module.exports = {
  generateICS,
  createRentReminder,
  createMaintenanceEvent,
  createShowingEvent,
  createLeaseEvent,
  createRecurringRentReminders,
  saveICSFile,
  formatICSDate,
  escapeICSText
};
