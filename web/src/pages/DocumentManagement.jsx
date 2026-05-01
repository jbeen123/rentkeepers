import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function DocumentManagement() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    document_type: 'other',
    property_id: '',
    tenant_id: '',
    tags: '',
    file: null
  });

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', filter],
    queryFn: () => api.get(`/api/documents?type=${filter}`),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['document-templates'],
    queryFn: () => api.get('/api/document-templates'),
  });

  const uploadDocument = useMutation({
    mutationFn: (formData) => api.post('/api/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      setShowUploadModal(false);
      setUploadData({
        title: '',
        description: '',
        document_type: 'other',
        property_id: '',
        tenant_id: '',
        tags: '',
        file: null
      });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (docId) => api.delete(`/api/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
    },
  });

  const documents = documentsData?.documents || [];
  const templates = templatesData?.templates || [];

  const getFileIcon = (type) => {
    const icons = {
      lease: '📄',
      inspection: '📋',
      photo: '📷',
      contract: '✍️',
      warranty: '🛡️',
      other: '📁'
    };
    return icons[type] || '📁';
  };

  const getFileTypeColor = (type) => {
    const colors = {
      lease: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
      inspection: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
      photo: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200',
      contract: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200',
      warranty: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    setUploadData({ ...uploadData, file: e.target.files[0] });
  };

  const handleUpload = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('title', uploadData.title);
    formData.append('description', uploadData.description);
    formData.append('document_type', uploadData.document_type);
    formData.append('property_id', uploadData.property_id);
    formData.append('tenant_id', uploadData.tenant_id);
    formData.append('tags', uploadData.tags);
    
    uploadDocument.mutate(formData);
  };

  const downloadDocument = (docId, fileName) => {
    window.open(`/api/documents/${docId}`, '_blank');
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading documents...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📁 Document Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            📝 Templates
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ⬆️ Upload Document
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">📋 Document Types</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
          {[
            { type: 'lease', label: 'Lease Agreements' },
            { type: 'inspection', label: 'Inspections' },
            { type: 'photo', label: 'Photos' },
            { type: 'contract', label: 'Contracts' },
            { type: 'warranty', label: 'Warranties' },
            { type: 'other', label: 'Other' }
          ].map(item => (
            <div key={item.type} className="flex items-center gap-2">
              <span>{getFileIcon(item.type)}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {['all', 'lease', 'inspection', 'photo', 'contract', 'warranty', 'other'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1 rounded ${filter === type ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              {getFileIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.length > 0 ? (
          documents.map((doc) => (
            <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{getFileIcon(doc.document_type)}</span>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-xs">{doc.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${getFileTypeColor(doc.document_type)}`}>
                      {doc.document_type}
                    </span>
                  </div>
                </div>
              </div>
              
              {doc.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{doc.description}</p>
              )}
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
                <div>📦 {formatFileSize(doc.file_size)}</div>
                <div>📅 {new Date(doc.created_at).toLocaleDateString()}</div>
                {doc.tags && <div>🏷️ {doc.tags}</div>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => downloadDocument(doc.id, doc.file_name)}
                  className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                >
                  ⬇️ Download
                </button>
                <button
                  onClick={() => deleteDocument.mutate(doc.id)}
                  className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-3">📁</div>
            <p>No documents found.</p>
            <p className="text-sm mt-1">Upload your first document!</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Upload Document</h3>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">File *</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    required
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Title *</label>
                  <input
                    type="text"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                    required
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Document title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Type</label>
                  <select
                    value={uploadData.document_type}
                    onChange={(e) => setUploadData({...uploadData, document_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="lease">📄 Lease Agreement</option>
                    <option value="inspection">📋 Inspection Report</option>
                    <option value="photo">📷 Photo</option>
                    <option value="contract">✍️ Contract</option>
                    <option value="warranty">🛡️ Warranty</option>
                    <option value="other">📁 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Description</label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Document description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={uploadData.tags}
                    onChange={(e) => setUploadData({...uploadData, tags: e.target.value})}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g., 2026, unit-101, renewal"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={uploadDocument.isPending}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
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

      {/* Templates Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">📝 Document Templates</h3>
                <button 
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Use templates to quickly generate standard documents. Variables like {'{tenant_name}'} will be auto-filled.
              </p>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {templates.length > 0 ? (
                  templates.map(template => (
                    <div key={template.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold">{template.name}</h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {template.template_type} • {template.category}
                          </span>
                        </div>
                        {template.is_default && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Variables: {template.variables}
                      </div>
                      <div className="flex gap-2">
                        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                          Use Template
                        </button>
                        {!template.is_default && (
                          <button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No templates yet. Default templates will be created when you upload your first document.
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t dark:border-gray-700">
                <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                  ➕ Create Custom Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
