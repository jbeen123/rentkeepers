import { useState, useEffect } from 'react';
import { FileText, Download, Mail, Calendar, DollarSign, TrendingUp, TrendingDown, 
         ChevronDown, ChevronUp, Plus, Building2, Settings, Receipt, Check } from 'lucide-react';

/**
 * Owner Statements Component
 * Fully integrated with RentKeepers Flask API
 */
function OwnerStatements({ propertyId, api }) {
  const [statements, setStatements] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('statements');
  
  // Generate form state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sendEmail, setSendEmail] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'maintenance',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: ''
  });
  const [addingExpense, setAddingExpense] = useState(false);

  useEffect(() => {
    if (propertyId && api) {
      fetchData();
    }
  }, [propertyId, api]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch statements and expenses in parallel
      const [statementsRes, expensesRes] = await Promise.all([
        api.get(`/statements/property/${propertyId}`),
        api.get(`/expenses?property_id=${propertyId}`).catch(() => ({ data: { expenses: [] } }))
      ]);
      
      setStatements(statementsRes.data.statements || []);
      setExpenses(expensesRes.data.expenses || []);
      
      // Try to fetch settings (may fail if not configured)
      try {
        const settingsRes = await api.get('/statements/company-settings');
        setSettings(settingsRes.data);
      } catch (e) {
        // Settings not configured yet, use defaults
        setSettings({
          company_name: 'RentKeepers',
          default_management_fee_percent: 10,
          auto_send_statements: false
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateStatement = async () => {
    setGenerating(true);
    try {
      const response = await api.post('/statements/generate', {
        property_id: propertyId,
        month: selectedMonth,
        year: selectedYear,
        send_email: sendEmail
      }, { 
        responseType: 'blob',
        headers: { 'Content-Type': 'application/json' }
      });

      // Create download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `owner-statement-${propertyId}-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      // Refresh list
      fetchData();
    } catch (error) {
      console.error('Error generating statement:', error);
      alert('Failed to generate statement. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', {
        ...expenseForm,
        property_id: propertyId,
        for_month: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
        amount: parseFloat(expenseForm.amount)
      });
      
      setExpenseForm({
        description: '',
        category: 'maintenance',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: ''
      });
      setAddingExpense(false);
      fetchData();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Make sure the API is configured.');
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleString('en-US', { month: 'long' })
  }));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const categories = ['maintenance', 'insurance', 'taxes', 'utilities', 'management', 'repairs', 'cleaning', 'other'];

  const periodExpenses = expenses.filter(e => 
    e.for_month === `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
  );

  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) return (
    <div className="flex items-center justify-center p-8 text-gray-500">
      <div className="animate-spin mr-2">⏳</div>
      Loading owner statements...
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <div className="text-red-500 mb-4">⚠️ {error}</div>
      <button 
        onClick={fetchData}
        className="bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'statements', label: 'Statements', icon: FileText },
          { id: 'expenses', label: 'Expenses', icon: Receipt },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Statements Tab */}
      {activeTab === 'statements' && (
        <>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Statement
            </h3>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Mail className="w-4 h-4" />
                Send via email
              </label>

              <button
                onClick={generateStatement}
                disabled={generating}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {generating ? (
                  <>⏳ Generating...</>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate Statement
                  </>
                )}
              </button>
            </div>        
            
            {settings && (
              <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                <span>Management Fee: {settings.default_management_fee_percent}%</span>
                <span className="text-gray-300">|</span>
                <span>
                  Auto-send: {settings.auto_send_statements ? `Yes (Day ${settings.auto_send_day})` : 'No'}
                </span>
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Previous Statements</h3>
            </div>
            
            {statements.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No statements yet.</p>
                <p className="text-sm">Generate your first statement above.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {statements.map((s) => (
                  <div key={`${s.year}-${s.month}`} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{s.period}</div>
                        <div className="text-sm text-gray-500">Monthly Owner Statement</div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        // Re-generate and download this period
                        setSelectedMonth(s.month);
                        setSelectedYear(s.year);
                        generateStatement();
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">
                Expenses for {new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-sm text-gray-500">{periodExpenses.length} expenses • Total: ${totalExpenses.toFixed(2)}</p>
            </div>
            <button
              onClick={() => setAddingExpense(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>

          {addingExpense && (
            <form onSubmit={addExpense} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Description *"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount *"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={e => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <input
                placeholder="Vendor Name (optional)"
                value={expenseForm.vendor_name}
                onChange={e => setExpenseForm({...expenseForm, vendor_name: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2 w-full md:w-1/2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  <Check className="w-4 h-4 inline mr-1" />
                  Save Expense
                </button>
                <button 
                  type="button" 
                  onClick={() => setAddingExpense(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {periodExpenses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No expenses for this period.</p>
                <p className="text-sm">Add expenses to include them in owner statements.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {periodExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(e.expense_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{e.description}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        ${e.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-sm text-gray-600">Total Expenses:</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">${totalExpenses.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <SettingsView 
          settings={settings}
          api={api}
          onUpdate={() => fetchData()}
        />
      )}
    </div>
  );
}

// Settings sub-component
function SettingsView({ settings, api, onUpdate }) {
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/statements/company-settings', localSettings);
      setSaved(true);
      onUpdate();
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Make sure the API is configured.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return (
    <div className="p-8 text-center text-gray-500">
      <div className="animate-spin mr-2 inline">⏳</div>
      Loading settings...
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          Settings saved successfully!
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Company Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              placeholder="Your Company Name"
              value={localSettings.company_name || ''}
              onChange={e => setLocalSettings({...localSettings, company_name: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              placeholder="(555) 123-4567"
              value={localSettings.company_phone || ''}
              onChange={e => setLocalSettings({...localSettings, company_phone: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="statements@company.com"
              value={localSettings.company_email || ''}
              onChange={e => setLocalSettings({...localSettings, company_email: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              placeholder="123 Business St"
              value={localSettings.company_address || ''}
              onChange={e => setLocalSettings({...localSettings, company_address: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              placeholder="City"
              value={localSettings.company_city || ''}
              onChange={e => setLocalSettings({...localSettings, company_city: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                placeholder="ST"
                maxLength={2}
                value={localSettings.company_state || ''}
                onChange={e => setLocalSettings({...localSettings, company_state: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                placeholder="12345"
                value={localSettings.company_zip || ''}
                onChange={e => setLocalSettings({...localSettings, company_zip: e.target.value})}
                className="border border-gray-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Statement Settings
        </h3>
        
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Default Management Fee:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={localSettings.default_management_fee_percent || 10}
              onChange={e => setLocalSettings({...localSettings, default_management_fee_percent: parseFloat(e.target.value)})}
              className="border border-gray-300 rounded-md px-3 py-2 w-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-600">%</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
          <textarea
            placeholder="Payment will be processed within 2-3 business days."
            value={localSettings.statement_payment_terms || ''}
            onChange={e => setLocalSettings({...localSettings, statement_payment_terms: e.target.value})}
            className="border border-gray-300 rounded-md px-3 py-2 w-full h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Auto-Send Settings
        </h3>
        
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={localSettings.auto_send_statements || false}
            onChange={e => setLocalSettings({...localSettings, auto_send_statements: e.target.checked})}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Automatically send statements each month</span>
        </label>
        
        {localSettings.auto_send_statements && (
          <div className="flex items-center gap-4 ml-7">
            <span className="text-sm text-gray-600">Send on day:</span>
            <input
              type="number"
              min={1}
              max={28}
              value={localSettings.auto_send_day || 5}
              onChange={e => setLocalSettings({...localSettings, auto_send_day: parseInt(e.target.value)})}
              className="border border-gray-300 rounded-md px-3 py-2 w-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-500">of each month</span>
          </div>
        )}
      </div>

      <button 
        type="submit" 
        disabled={saving}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        {saving ? (
          <>⏳ Saving...</>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Save Settings
          </>
        )}
      </button>
    </form>
  );
}

export default OwnerStatements;
