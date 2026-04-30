import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Mail, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

/**
 * Owner Statements Component
 * Displays monthly owner statements with download and filtering
 */
function OwnerStatements({ ownerId }) {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    property: 'all',
    year: new Date().getFullYear().toString()
  });
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchStatements();
  }, [ownerId, filters]);

  const fetchStatements = async () => {
    try {
      const response = await fetch(
        `/api/statements/owner/${ownerId}?year=${filters.year}`
      );
      const data = await response.json();
      setStatements(data.statements);
    } catch (error) {
      console.error('Error fetching statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadStatement = async (statementId) => {
    try {
      const response = await fetch(`/api/statements/download/${statementId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statement-${statementId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Error downloading statement:', error);
    }
  };

  const emailStatement = async (statementId) => {
    try {
      await fetch(`/api/statements/${statementId}/email`, {
        method: 'POST'
      });
      // Show success toast
    } catch (error) {
      console.error('Error emailing statement:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => 
    new Date().getFullYear() - i
  );

  if (loading) return <div className="p-8 text-center">Loading statements...\u003c/div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Owner Statements</h1>
        <p className="text-gray-600">
          View and download your monthly property performance reports
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard 
          title="Total Income (YTD)" 
          value={formatCurrency(calculateTotal(statements, 'totalIncome'))}
          icon={TrendingUp}
          color="green"
        />
        <SummaryCard 
          title="Total Expenses (YTD)" 
          value={formatCurrency(calculateTotal(statements, 'totalExpenses'))}
          icon={TrendingDown}
          color="red"
        />
        <SummaryCard 
          title="Management Fees (YTD)" 
          value={formatCurrency(calculateTotal(statements, 'managementFee'))}
          icon={DollarSign}
          color="blue"
        />
        <SummaryCard 
          title="Net to Owner (YTD)" 
          value={formatCurrency(calculateTotal(statements, 'netToOwner'))}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statements List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {statements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No statements found for the selected period.</p>
          </div>
        ) : (
          statements.map((statement) => (
            <StatementRow
              key={statement.id}
              statement={statement}
              expanded={expanded === statement.id}
              onToggle={() => setExpanded(
                expanded === statement.id ? null : statement.id
              )}
              onDownload={() => downloadStatement(statement.id)}
              onEmail={() => emailStatement(statement.id)}
              formatCurrency={formatCurrency}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700'
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-75">{title}</span>
        <Icon className="w-5 h-5 opacity-50" />
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function StatementRow({ statement, expanded, onToggle, onDownload, onEmail, formatCurrency }) {
  const monthName = format(new Date(statement.year, statement.month - 1), 'MMMM');
  const isPositive = statement.netToOwner >= 0;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {monthName} {statement.year}
            </div>
            <div className="text-sm text-gray-500">{statement.property}</div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-sm text-gray-500">Net to Owner</div>
            <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(statement.netToOwner)}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Download PDF"
            >
              <Download className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEmail(); }}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Email Statement"
            >
              <Mail className="w-4 h-4 text-gray-600" />
            </button>
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            <DetailItem label="Total Income" value={formatCurrency(statement.summary.totalIncome)} />
            <DetailItem label="Total Expenses" value={formatCurrency(statement.summary.totalExpenses)} />
            <DetailItem label="Management Fee" value={formatCurrency(statement.summary.managementFee)} />
            <DetailItem label="Transaction Count" value={statement.transactionCount} />
          </div>
          
          {statement.status === 'sent' && statement.emailSentAt && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Emailed on {format(new Date(statement.emailSentAt), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function calculateTotal(statements, field) {
  return statements.reduce((sum, s) => sum + (s.summary?.[field] || 0), 0);
}

export default OwnerStatements;
