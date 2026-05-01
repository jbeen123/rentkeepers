import { useState } from 'react';

export default function EmailTemplates({ onInsert }) {
  const [showTemplates, setShowTemplates] = useState(false);

  const templates = {
    welcome: {
      subject: 'Welcome to Your New Home!',
      body: `Dear {tenant_name},

Welcome to your new home at {property_address}! We're excited to have you as a tenant.

Here's some important information to get you started:

- Rent Amount: ${'{'}{rent_amount}{'}'}
- Due Date: {'}'}{due_day}{'{'} of each month
- Payment Methods: Online portal, check, or bank transfer
- Maintenance Requests: Submit through the tenant portal
- Emergency Contact: {landlord_phone}

If you have any questions, please don't hesitate to reach out.

Best regards,
{landlord_name}
RentKeepers Property Management`
    },
    rent_increase: {
      subject: 'Rent Adjustment Notice',
      body: `Dear {tenant_name},

This letter serves as formal notice that your rent will be adjusted effective {effective_date}.

Current Rent: ${'{'}{current_rent}{'}'}
New Rent: {'}'}{new_rent}{'{'}
Effective Date: {effective_date}

This adjustment reflects changes in market rates and property maintenance costs. We strive to keep our rents competitive while maintaining the quality of your living space.

If you have any questions, please contact us.

Best regards,
{landlord_name}`
    },
    maintenance_scheduled: {
      subject: 'Maintenance Scheduled for {property_address}',
      body: `Dear {tenant_name},

This is to inform you that maintenance has been scheduled for your unit.

Date: {maintenance_date}
Time: {maintenance_time}
Work to be Performed: {work_description}

Please ensure access is available. If you need to reschedule, please contact us at least 24 hours in advance.

Thank you for your cooperation.

Best regards,
{landlord_name}`
    },
    lease_renewal: {
      subject: 'Lease Renewal Opportunity',
      body: `Dear {tenant_name},

Your lease is set to expire on {lease_end_date}. We would love to have you continue as a tenant!

Lease Renewal Terms:
- Lease Period: {new_lease_term}
- Rent: ${'{'}{new_rent}{'}'}
- Other Terms: {lease_terms}

Please let us know by {response_deadline} if you would like to renew.

We appreciate you as a tenant and hope to continue our relationship.

Best regards,
{landlord_name}`
    },
    late_rent: {
      subject: 'Late Rent Notice - {property_address}',
      body: `Dear {tenant_name},

This is a friendly reminder that your rent payment for {month} is past due.

Amount Due: ${'{'}{amount_due}{'}'}
Late Fee: {'}'}{late_fee}{'{'}
Total Due: {total_due}

Please submit payment as soon as possible to avoid additional fees.

If you have already sent payment, please disregard this notice.

Best regards,
{landlord_name}`
    },
    inspection_notice: {
      subject: 'Property Inspection Notice',
      body: `Dear {tenant_name},

This letter serves as formal notice that we will be conducting a property inspection.

Date: {inspection_date}
Time: {inspection_time}
Purpose: {inspection_purpose}

You do not need to be present, but you are welcome to be there. If you have any concerns, please let us know.

Best regards,
{landlord_name}`
    },
    move_out_instructions: {
      subject: 'Move-Out Instructions - {property_address}',
      body: `Dear {tenant_name},

As you prepare to move out of {property_address}, please follow these instructions:

1. Clean the entire unit
2. Remove all personal belongings
3. Return all keys and remotes
4. Provide forwarding address for security deposit
5. Schedule final walk-through

Move-Out Date: {move_out_date}
Security Deposit: ${'{'}{deposit_amount}{'}'}

We will conduct a final inspection within {inspection_days} days of move-out.

Best regards,
{landlord_name}`
    }
  };

  const handleInsert = (template) => {
    if (onInsert) {
      onInsert(template);
    }
    setShowTemplates(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowTemplates(!showTemplates)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
      >
        📝 Templates
      </button>

      {showTemplates && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b dark:border-gray-700">
            <h4 className="font-bold text-gray-800 dark:text-gray-200">Email Templates</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Click to insert</p>
          </div>
          
          <div className="divide-y dark:divide-gray-700">
            {Object.entries(templates).map(([key, template]) => (
              <button
                key={key}
                onClick={() => handleInsert(template)}
                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                  {template.subject.split(':')[0]}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {template.body.substring(0, 80)}...
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
