import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function Calendar() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    event_type: 'custom',
    start_date: '',
    end_date: '',
    all_day: true,
    color: 'blue',
    priority: 'normal'
  });

  const { data: eventsData } = useQuery({
    queryKey: ['calendar-events', currentDate.getMonth(), currentDate.getFullYear()],
    queryFn: () => {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return api.get(`/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`);
    },
  });

  const createEvent = useMutation({
    mutationFn: (data) => api.post('/api/calendar/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-events']);
      setShowEventModal(false);
      setEventData({
        title: '',
        description: '',
        event_type: 'custom',
        start_date: '',
        end_date: '',
        all_day: true,
        color: 'blue',
        priority: 'normal'
      });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: (eventId) => api.delete(`/api/calendar/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-events']);
    },
  });

  const events = eventsData?.events || [];

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDay = (date) => {
    if (!date) return [];
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      rent_due: 'bg-green-500',
      lease_expiration: 'bg-red-500',
      maintenance: 'bg-orange-500',
      inspection: 'bg-purple-500',
      custom: 'bg-blue-500'
    };
    return colors[type] || 'bg-blue-500';
  };

  const getEventTypeIcon = (type) => {
    const icons = {
      rent_due: '💰',
      lease_expiration: '📄',
      maintenance: '🔧',
      inspection: '🔍',
      custom: '📅'
    };
    return icons[type] || '📅';
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setEventData({
      ...eventData,
      start_date: date ? date.toISOString().split('T')[0] : ''
    });
    setShowEventModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createEvent.mutate({
      ...eventData,
      start_date: new Date(eventData.start_date).toISOString(),
      end_date: eventData.end_date ? new Date(eventData.end_date).toISOString() : null
    });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📅 Calendar</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleDayClick(new Date())}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ➕ Add Event
          </button>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded">
            ◀
          </button>
          <h3 className="text-xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button onClick={nextMonth} className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded">
            ▶
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          {['day', 'week', 'month'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded ${view === v ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Calendar Grid */}
        {view === 'month' && (
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(day => (
              <div key={day} className="text-center font-bold text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
            
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isToday = day && day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-24 p-2 border dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !day ? 'bg-gray-50 dark:bg-gray-800' : ''
                  } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded text-white truncate ${getEventTypeColor(event.event_type)}`}
                            title={event.title}
                          >
                            {getEventTypeIcon(event.event_type)} {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="font-bold text-lg mb-4">📋 Upcoming Events</h3>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.slice(0, 10).map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.event_type)}`}></div>
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(event.start_date).toLocaleDateString()} {event.all_day ? '(All Day)' : ''}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteEvent.mutate(event.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No upcoming events. Click a date to add one!
          </div>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Add Event</h3>
                <button 
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Title *</label>
                  <input
                    type="text"
                    value={eventData.title}
                    onChange={(e) => setEventData({...eventData, title: e.target.value})}
                    required
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Event title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Type</label>
                  <select
                    value={eventData.event_type}
                    onChange={(e) => setEventData({...eventData, event_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="custom">📅 Custom</option>
                    <option value="rent_due">💰 Rent Due</option>
                    <option value="lease_expiration">📄 Lease Expiration</option>
                    <option value="maintenance">🔧 Maintenance</option>
                    <option value="inspection">🔍 Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Date *</label>
                  <input
                    type="date"
                    value={eventData.start_date}
                    onChange={(e) => setEventData({...eventData, start_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Color</label>
                  <select
                    value={eventData.color}
                    onChange={(e) => setEventData({...eventData, color: e.target.value})}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="red">Red</option>
                    <option value="orange">Orange</option>
                    <option value="purple">Purple</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Description</label>
                  <textarea
                    value={eventData.description}
                    onChange={(e) => setEventData({...eventData, description: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Event details..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createEvent.isPending}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createEvent.isPending ? 'Adding...' : 'Add Event'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Event Types Legend */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h4 className="font-bold mb-3">📊 Event Types</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { type: 'rent_due', label: 'Rent Due' },
            { type: 'lease_expiration', label: 'Lease Expiration' },
            { type: 'maintenance', label: 'Maintenance' },
            { type: 'inspection', label: 'Inspection' },
            { type: 'custom', label: 'Custom' }
          ].map(item => (
            <div key={item.type} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${getEventTypeColor(item.type)}`}></div>
              <span className="text-sm">{getEventTypeIcon(item.type)} {item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
