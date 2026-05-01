import { useState } from 'react';

export default function AIMaintenanceTriage({ request }) {
  const getUrgencyBadge = (urgency) => {
    const badges = {
      emergency: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-200', label: '🚨 EMERGENCY' },
      urgent: { bg: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-800 dark:text-orange-200', label: '⚠️ URGENT' },
      routine: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-200', label: '📋 ROUTINE' }
    };
    return badges[urgency] || badges.routine;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      plumbing: '🚰',
      electrical: '⚡',
      hvac: '🌡️',
      appliance: '🔧',
      structural: '🏠',
      pest: '🐀',
      safety: '🚨',
      other: '📝'
    };
    return icons[category] || '📝';
  };

  const urgency = request.ai_urgency || 'routine';
  const category = request.ai_category || 'other';
  const badge = getUrgencyBadge(urgency);

  return (
    <div className="space-y-3">
      {/* AI Analysis Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${badge.bg} ${badge.text} text-sm font-bold`}>
        <span>{badge.label}</span>
      </div>

      {/* Category & Details */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{getCategoryIcon(category)}</span>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">AI Category</div>
            <div className="font-bold capitalize">{category.replace('_', ' ')}</div>
          </div>
        </div>

        {/* AI Summary */}
        {request.ai_summary && (
          <div className="mb-3">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">AI Analysis</div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{request.ai_summary}</p>
          </div>
        )}

        {/* Suggested Action */}
        {request.ai_suggested_action && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-1">💡 Suggested Action</div>
            <p className="text-sm text-blue-700 dark:text-blue-300">{request.ai_suggested_action}</p>
          </div>
        )}

        {/* Vendor Match */}
        {request.ai_suggested_vendor && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Recommended:</span>
            <span className="font-medium">{request.ai_suggested_vendor}</span>
          </div>
        )}

        {/* Emergency Warning */}
        {urgency === 'emergency' && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-bold mb-2">
              <span>🚨</span>
              <span>IMMEDIATE ACTION REQUIRED</span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">
              This appears to be an emergency situation. Contact emergency services or a 24/7 contractor immediately.
            </p>
          </div>
        )}
      </div>

      {/* Confidence Score */}
      {request.ai_confidence && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          AI Confidence: {request.ai_confidence}% • 
          <span className="ml-2">Review recommended for low confidence scores</span>
        </div>
      )}
    </div>
  );
}
