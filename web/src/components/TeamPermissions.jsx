import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export default function TeamPermissions() {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'assistant',
    properties: []
  });

  const { data: teamData } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/api/team'),
  });

  const teamMembers = teamData?.members || [];

  const roles = {
    admin: {
      name: 'Admin',
      icon: '👑',
      color: 'purple',
      permissions: [
        'Full account access',
        'Manage team members',
        'View financial reports',
        'Delete data',
        'Change settings'
      ]
    },
    property_manager: {
      name: 'Property Manager',
      icon: '🏢',
      color: 'blue',
      permissions: [
        'Manage properties',
        'Manage tenants',
        'Record payments',
        'View reports',
        'Handle maintenance'
      ]
    },
    assistant: {
      name: 'Assistant',
      icon: '📋',
      color: 'green',
      permissions: [
        'View properties',
        'View tenants',
        'Record payments',
        'Respond to maintenance',
        'No delete access'
      ]
    }
  };

  const sendInvite = async () => {
    try {
      await api.post('/api/team/invite', inviteData);
      setShowInvite(false);
      alert('Invitation sent!');
    } catch (err) {
      alert('Failed to send invitation');
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    try {
      await api.post(`/api/team/${memberId}/role`, { role: newRole });
      alert('Role updated');
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const removeMember = async (memberId) => {
    if (!confirm('Remove this team member?')) return;
    
    try {
      await api.delete(`/api/team/${memberId}`);
      alert('Member removed');
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">👥 Team & Permissions</h3>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Invite Member
        </button>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Manage team member access with role-based permissions. Control what each member can see and do.
      </p>

      {/* Role Definitions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(roles).map(([key, role]) => (
          <div key={key} className={`border-2 border-${role.color}-200 dark:border-${role.color}-800 rounded-lg p-4`}>
            <div className="text-2xl mb-2">{role.icon} {role.name}</div>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {role.permissions.map((perm, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Team Members */}
      <div className="space-y-3">
        <h4 className="font-bold">Current Team Members</h4>
        {teamMembers.length > 0 ? (
          teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                  {member.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{member.email}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {roles[member.role]?.icon} {roles[member.role]?.name}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={member.role}
                  onChange={(e) => updateMemberRole(member.id, e.target.value)}
                  className="px-3 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="admin">Admin</option>
                  <option value="property_manager">Property Manager</option>
                  <option value="assistant">Assistant</option>
                </select>
                {member.role !== 'admin' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No team members yet. Invite your first team member!
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Invite Team Member</h3>
                <button 
                  onClick={() => setShowInvite(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Email Address</label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="colleague@example.com"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Role</label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  >
                    <option value="admin">Admin (Full Access)</option>
                    <option value="property_manager">Property Manager</option>
                    <option value="assistant">Assistant</option>
                  </select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>📧 How it works:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Invitation email sent to the address above</li>
                      <li>They create their own login credentials</li>
                      <li>Access is limited to their role's permissions</li>
                      <li>You can change or revoke access anytime</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={sendInvite}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    Send Invitation
                  </button>
                  <button
                    onClick={() => setShowInvite(false)}
                    className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
