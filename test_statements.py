"""
Test script for owner statements
Run this to generate a sample PDF
"""
from owner_statements import OwnerStatementGenerator
from datetime import datetime

def test_generate_statement():
    """Generate a test statement"""
    
    generator = OwnerStatementGenerator()
    
    # Sample data matching your RentKeepers structure
    data = {
        'company': {
            'name': 'RentKeepers Property Management',
            'address': '123 Business Plaza, Suite 500',
            'city': 'Austin',
            'state': 'TX',
            'zip': '78701',
            'phone': '(512) 555-0100',
            'email': 'statements@rentkeepers.app'
        },
        'owner': {
            'name': 'Robert Johnson',
            'address': '456 Oakwood Drive',
            'city': 'Houston',
            'state': 'TX',
            'zip': '77001',
            'email': 'rjohnson@email.com'
        },
        'property': {
            'id': 'PROP-7829',
            'name': 'Lakeside Apartments',
            'address': '789 Lakeview Boulevard',
            'city': 'Austin',
            'state': 'TX',
            'zip': '78745',
            'unit_count': 64
        },
        'statement_period': {
            'month': 3,
            'year': 2025
        },
        'transactions': [
            {'date': '2025-03-01', 'description': 'Unit 101 - March Rent', 'category': 'Rent', 'type': 'income', 'amount': 1450.00},
            {'date': '2025-03-01', 'description': 'Unit 102 - March Rent', 'category': 'Rent', 'type': 'income', 'amount': 1450.00},
            {'date': '2025-03-01', 'description': 'Unit 103 - March Rent', 'category': 'Rent', 'type': 'income', 'amount': 1500.00},
            {'date': '2025-03-05', 'description': 'Unit 104 - March Rent', 'category': 'Rent', 'type': 'income', 'amount': 1450.00},
            {'date': '2025-03-08', 'description': 'Unit 105 - March Rent (Late)', 'category': 'Rent', 'type': 'income', 'amount': 1475.00},
            {'date': '2025-03-10', 'description': 'Unit 106 - March Rent', 'category': 'Rent', 'type': 'income', 'amount': 1600.00},
            {'date': '2025-03-12', 'description': 'Unit 107 - March Rent', 'category': 'Rent', 'type': 'income', 'amount': 1450.00},
            {'date': '2025-03-15', 'description': 'Unit 108 - March Rent', 'category': 'Rent', 'type': 'income', 'amount': 1450.00},
            {'date': '2025-03-15', 'description': 'Unit 109 - March Rent', 'category': 'Rent', 'type': 'income', 'amount': 1550.00},
            {'date': '2025-03-18', 'description': 'Unit 110 - March Rent', 'category': 'Rent', 'type': 'income', 'amount': 1450.00},
            {'date': '2025-03-02', 'description': 'Plumbing Repair - Unit 103', 'category': 'Maintenance', 'type': 'expense', 'amount': 245.00},
            {'date': '2025-03-04', 'description': 'HVAC Service - Multiple Units', 'category': 'Maintenance', 'type': 'expense', 'amount': 485.00},
            {'date': '2025-03-08', 'description': 'Carpet Cleaning - Unit 105', 'category': 'Maintenance', 'type': 'expense', 'amount': 180.00},
            {'date': '2025-03-12', 'description': 'Appliance Repair - Unit 108', 'category': 'Maintenance', 'type': 'expense', 'amount': 320.00},
            {'date': '2025-03-15', 'description': 'Landscaping Service', 'category': 'Maintenance', 'type': 'expense', 'amount': 450.00},
            {'date': '2025-03-18', 'description': 'Electrical Work - Unit 102', 'category': 'Maintenance', 'type': 'expense', 'amount': 275.00},
            {'date': '2025-03-20', 'description': 'Property Insurance', 'category': 'Insurance', 'type': 'expense', 'amount': 890.00},
            {'date': '2025-03-22', 'description': 'Property Taxes (Monthly)', 'category': 'Taxes', 'type': 'expense', 'amount': 1200.00},
            {'date': '2025-03-25', 'description': 'Common Area Cleaning', 'category': 'Maintenance', 'type': 'expense', 'amount': 350.00}
        ],
        'summary': {
            'total_income': 14175.00,
            'total_expenses': 4595.00,
            'management_fee': 1417.50,
            'net_to_owner': 8162.50
        }
    }
    
    # Generate PDF
    pdf_buffer = generator.generate_statement(data)
    
    # Save to file
    output_path = 'test_owner_statement.pdf'
    with open(output_path, 'wb') as f:
        f.write(pdf_buffer.getvalue())
    
    print(f"✅ Test statement generated: {output_path}")
    print(f"   Total Income: ${data['summary']['total_income']:,.2f}")
    print(f"   Total Expenses: ${data['summary']['total_expenses']:,.2f}")
    print(f"   Management Fee: ${data['summary']['management_fee']:,.2f}")
    print(f"   Net to Owner: ${data['summary']['net_to_owner']:,.2f}")
    print(f"   Transactions: {len(data['transactions'])}")

if __name__ == '__main__':
    test_generate_statement()
