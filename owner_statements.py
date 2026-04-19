"""
Owner Statements PDF Generation for RentKeepers
Integrates with existing Flask/SQLAlchemy stack
Features: Expense tracking, company branding, management fee config, email delivery
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from datetime import datetime, timedelta
from io import BytesIO
import os
import requests
from flask import send_file, jsonify, request, current_app
from flask_login import login_required, current_user
from functools import wraps

# Import models (with fallbacks for extensions)
try:
    from models import get_db_session, Property, Payment, User, Tenant, CompanySettings, Expense, OwnerStatementRecord
    MODELS_EXTENDED = True
except ImportError:
    from models import get_db_session, Property, Payment, User, Tenant
    MODELS_EXTENDED = False
    print("Warning: Extended models not found. Run database migrations for full features.")


class OwnerStatementGenerator:
    """Generate professional PDF owner statements"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Create custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            fontSize=18,
            fontName='Helvetica-Bold',
            spaceAfter=6,
            textColor=colors.HexColor('#1f2937')
        ))
        self.styles.add(ParagraphStyle(
            name='StatementTitle',
            fontSize=14,
            fontName='Helvetica-Bold',
            spaceAfter=4,
            textColor=colors.HexColor('#374151'),
            alignment=TA_RIGHT
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            fontSize=10,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#6b7280'),
            spaceAfter=2
        ))
        self.styles.add(ParagraphStyle(
            name='CardLabel',
            fontSize=9,
            fontName='Helvetica',
            textColor=colors.HexColor('#6b7280')
        ))
        self.styles.add(ParagraphStyle(
            name='CardValue',
            fontSize=12,
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#374151')
        ))
        self.styles.add(ParagraphStyle(
            name='FooterNote',
            fontSize=8,
            fontName='Helvetica',
            textColor=colors.HexColor('#6b7280')
        ))

    def generate_statement(self, data, logo_path=None):
        """
        Generate a PDF owner statement
        
        Args:
            data: dict containing company, owner, property, transactions, summary
            logo_path: Optional path to company logo image
        
        Returns:
            BytesIO: PDF file as bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=50,
            leftMargin=50,
            topMargin=50,
            bottomMargin=50
        )
        
        elements = []
        
        # Build the document
        elements.extend(self._build_header(data['company'], data['statement_period'], logo_path))
        elements.extend(self._build_owner_property_info(data['owner'], data['property']))
        elements.extend(self._build_summary_cards(data['summary']))
        elements.extend(self._build_transactions_table(data['transactions']))
        elements.extend(self._build_footer(data['summary'], data.get('company', {}).get('payment_terms')))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer

    def _build_header(self, company, period, logo_path=None):
        """Build header section with company branding"""
        elements = []
        
        # Company info (left side)
        company_text = f"""
        <b>{company['name']}</b><br/>
        {company.get('address', '')}<br/>
        {company.get('city', '')}, {company.get('state', '')} {company.get('zip', '')}<br/>
        Phone: {company.get('phone', '')} | Email: {company.get('email', '')}
        """
        
        # Add logo if provided
        if logo_path and os.path.exists(logo_path):
            try:
                img = Image(logo_path, width=100, height=50)
                header_data = [
                    [img, 
                     Paragraph(f"""
                     <para align=right>
                     <b>OWNER STATEMENT</b><br/>
                     {datetime(period['year'], period['month'], 1).strftime('%B %Y')}<br/>
                     </para>
                     """, self.styles['Normal'])],
                    [Paragraph(company_text, self.styles['Normal']), '']
                ]
                header_table = Table(header_data, colWidths=[250, 250])
            except:
                # Fallback without logo
                header_data = [
                    [Paragraph(company_text, self.styles['Normal']),
                     Paragraph(f"""
                     <para align=right>
                     <b>OWNER STATEMENT</b><br/>
                     {datetime(period['year'], period['month'], 1).strftime('%B %Y')}<br/>
                     </para>
                     """, self.styles['Normal'])]
                ]
                header_table = Table(header_data, colWidths=[350, 200])
        else:
            header_data = [
                [Paragraph(company_text, self.styles['Normal']),
                 Paragraph(f"""
                 <para align=right>
                 <b>OWNER STATEMENT</b><br/>
                 {datetime(period['year'], period['month'], 1).strftime('%B %Y')}<br/>
                 </para>
                 """, self.styles['Normal'])]
            ]
            header_table = Table(header_data, colWidths=[350, 200])
        
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
            ('RIGHTPADDING', (1, 0), (1, 0), 0),
        ]))
        
        elements.append(header_table)
        elements.append(Spacer(1, 20))
        
        # Horizontal line
        line_table = Table([['']], colWidths=[500])
        line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 15))
        
        return elements

    def _build_owner_property_info(self, owner, property_data):
        """Build owner and property info section"""
        elements = []
        
        owner_text = f"""
        <b>OWNER</b><br/>
        {owner['name']}<br/>
        {owner.get('address', '')}<br/>
        {owner.get('city', '')}, {owner.get('state', '')} {owner.get('zip', '')}<br/>
        {owner.get('email', '')}
        """
        
        property_text = f"""
        <b>PROPERTY</b><br/>
        {property_data.get('name', property_data['address'])}<br/>
        {property_data['address']}<br/>
        {property_data.get('city', '')}, {property_data.get('state', '')} {property_data.get('zip', '')}<br/>
        """
        if property_data.get('unit_count'):
            property_text += f"{property_data['unit_count']} Units"
        
        info_data = [
            [Paragraph(owner_text, self.styles['Normal']),
             Paragraph(property_text, self.styles['Normal'])]
        ]
        
        info_table = Table(info_data, colWidths=[250, 250])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
        ]))
        
        elements.append(info_table)
        elements.append(Spacer(1, 20))
        
        return elements

    def _build_summary_cards(self, summary):
        """Build summary cards with key metrics"""
        elements = []
        
        # Card data
        cards = [
            ('Total Income', self._format_currency(summary['total_income']), colors.HexColor('#22c55e')),
            ('Total Expenses', self._format_currency(summary['total_expenses']), colors.HexColor('#ef4444')),
            ('Management Fee', self._format_currency(summary['management_fee']), colors.HexColor('#3b82f6')),
            ('Net to Owner', self._format_currency(summary['net_to_owner']), 
             colors.HexColor('#22c55e') if summary['net_to_owner'] >= 0 else colors.HexColor('#ef4444'))
        ]
        
        # Build card table
        card_data = []
        row1 = []
        row2 = []
        
        for label, value, color in cards:
            row1.append(Paragraph(f"<font size=8 color='#6b7280'>{label}</font>", self.styles['Normal']))
            row2.append(Paragraph(f"<font size=11 color='#{color.hexval()[2:]}'><b>{value}</b></font>", self.styles['Normal']))
        
        card_data.append(row1)
        card_data.append(row2)
        
        card_table = Table(card_data, colWidths=[120, 120, 120, 120])
        card_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 1), (-1, 1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
            ('BOX', (0, 0), (0, -1), 1, colors.HexColor('#e5e7eb')),
            ('BOX', (1, 0), (1, -1), 1, colors.HexColor('#e5e7eb')),
            ('BOX', (2, 0), (2, -1), 1, colors.HexColor('#e5e7eb')),
            ('BOX', (3, 0), (3, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        
        elements.append(card_table)
        elements.append(Spacer(1, 25))
        
        return elements

    def _build_transactions_table(self, transactions):
        """Build transactions table"""
        elements = []
        
        # Table header
        data = [['Date', 'Description', 'Category', 'Income', 'Expense']]
        
        # Add transaction rows
        for txn in transactions:
            row = [
                self._format_date(txn['date']),
                self._truncate_text(txn['description'], 35),
                txn['category'],
                self._format_currency(txn['amount']) if txn['type'] == 'income' else '',
                self._format_currency(txn['amount']) if txn['type'] == 'expense' else ''
            ]
            data.append(row)
        
        # Create table
        table = Table(data, colWidths=[80, 180, 80, 80, 80])
        
        # Style the table
        style = TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            # Body
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            
            # Grid
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#e5e7eb')),
        ])
        
        table.setStyle(style)
        elements.append(table)
        elements.append(Spacer(1, 20))
        
        return elements

    def _build_footer(self, summary, payment_terms=None):
        """Build footer with totals"""
        elements = []
        
        # Divider line
        line_table = Table([['']], colWidths=[500])
        line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(line_table)
        elements.append(Spacer(1, 10))
        
        # Summary totals (right-aligned)
        totals_data = [
            ['', 'Total Income:', self._format_currency(summary['total_income'])],
            ['', 'Total Expenses:', self._format_currency(summary['total_expenses'])],
            ['', 'Management Fee:', f"({self._format_currency(summary['management_fee'])} @ {summary.get('fee_percent', 10)}%)"],
            ['', 'NET TO OWNER:', self._format_currency(summary['net_to_owner'])]
        ]
        
        totals_table = Table(totals_data, colWidths=[250, 150, 100])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('FONTNAME', (1, 0), (1, -2), 'Helvetica'),
            ('FONTNAME', (1, 3), (2, 3), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('LINEABOVE', (1, 3), (2, 3), 1, colors.HexColor('#374151')),
        ]))
        
        elements.append(totals_table)
        elements.append(Spacer(1, 30))
        
        # Footer note
        default_terms = "Payment will be processed within 2-3 business days."
        terms = payment_terms or default_terms
        footer_text = f"""
        <font size=8 color='#6b7280'>
        {terms}<br/>
        Generated on {datetime.now().strftime('%B %d, %Y')}
        </font>
        """
        
        elements.append(Paragraph(footer_text, self.styles['Normal']))
        
        return elements

    def _format_currency(self, amount):
        """Format amount as currency"""
        return "${:,.2f}".format(amount)

    def _format_date(self, date_str):
        """Format date string to readable format"""
        if isinstance(date_str, str):
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        else:
            date_obj = date_str
        return date_obj.strftime('%b %d, %Y')

    def _truncate_text(self, text, max_length):
        """Truncate text to max length"""
        if len(text) <= max_length:
            return text
        return text[:max_length - 3] + '...'


# ============== STATEMENT SERVICE ==============

class StatementService:
    """Business logic for owner statements"""
    
    def __init__(self):
        self.generator = OwnerStatementGenerator()
    
    def get_or_create_company_settings(self, db, user_id):
        """Get company settings or create defaults"""
        if not MODELS_EXTENDED:
            return None
            
        settings = db.query(CompanySettings).filter_by(user_id=user_id).first()
        if not settings:
            settings = CompanySettings(
                user_id=user_id,
                company_name='RentKeepers',
                company_email='support@rentkeepers.app'
            )
            db.add(settings)
            db.commit()
        return settings
    
    def build_statement_data(self, db, prop, user, month, year, company_settings=None):
        """Build complete statement data from database"""
        
        month_str = f"{year}-{month:02d}"
        
        # Get company info
        if company_settings:
            company = {
                'name': company_settings.company_name,
                'address': company_settings.company_address or '',
                'city': company_settings.company_city or '',
                'state': company_settings.company_state or '',
                'zip': company_settings.company_zip or '',
                'phone': company_settings.company_phone or '',
                'email': company_settings.company_email or '',
                'payment_terms': company_settings.statement_payment_terms
            }
            management_fee_percent = company_settings.default_management_fee_percent
        else:
            company = {
                'name': 'RentKeepers',
                'address': 'Property Management',
                'city': '', 'state': '', 'zip': '',
                'phone': '', 'email': 'support@rentkeepers.app'
            }
            # Check if Property has management_fee_percent
            management_fee_percent = getattr(prop, 'management_fee_percent', 10.0) or 10.0
        
        # Get owner info (the user)
        owner = {
            'name': f"{user.first_name or ''} {user.email}".strip() or user.email,
            'address': '',
            'city': '', 'state': '', 'zip': '',
            'email': user.email
        }
        
        # Get property info
        property_data = {
            'id': str(prop.id),
            'name': prop.name,
            'address': prop.address,
            'city': getattr(prop, 'city', '') or '',
            'state': getattr(prop, 'state', '') or '',
            'zip': getattr(prop, 'zip_code', '') or '',
            'unit_count': len(prop.tenants) if hasattr(prop, 'tenants') else 1
        }
        
        # Get income (payments)
        transactions = []
        total_income = 0
        
        payments = db.query(Payment).filter(
            Payment.user_id == user.id,
            Payment.for_month == month_str
        ).all()
        
        for payment in payments:
            transactions.append({
                'date': payment.payment_date.strftime('%Y-%m-%d'),
                'description': f"Rent payment - {payment.tenant.name if hasattr(payment, 'tenant') else 'Tenant'}",
                'category': 'Rent',
                'type': 'income',
                'amount': payment.amount_paid
            })
            total_income += payment.amount_paid
        
        # Get expenses (from extended model)
        total_expenses = 0
        if MODELS_EXTENDED:
            expenses = db.query(Expense).filter(
                Expense.user_id == user.id,
                Expense.property_id == prop.id,
                Expense.for_month == month_str
            ).all()
            
            for expense in expenses:
                transactions.append({
                    'date': expense.expense_date.strftime('%Y-%m-%d'),
                    'description': expense.description,
                    'category': expense.category,
                    'type': 'expense',
                    'amount': expense.amount
                })
                total_expenses += expense.amount
        
        # Calculate management fee
        management_fee = total_income * (management_fee_percent / 100)
        
        # Sort transactions by date
        transactions.sort(key=lambda x: x['date'])
        
        return {
            'company': company,
            'owner': owner,
            'property': property_data,
            'statement_period': {'month': month, 'year': year},
            'transactions': transactions,
            'summary': {
                'total_income': total_income,
                'total_expenses': total_expenses,
                'management_fee': management_fee,
                'net_to_owner': total_income - total_expenses - management_fee,
                'fee_percent': management_fee_percent
            }
        }
    
    def save_statement_record(self, db, user_id, property_id, month, year, data, pdf_path=None):
        """Save statement metadata to database"""
        if not MODELS_EXTENDED:
            return None
            
        summary = data['summary']
        
        statement = OwnerStatementRecord(
            user_id=user_id,
            property_id=property_id,
            month=month,
            year=year,
            total_income=summary['total_income'],
            total_expenses=summary['total_expenses'],
            management_fee=summary['management_fee'],
            management_fee_percent=summary['fee_percent'],
            net_to_owner=summary['net_to_owner'],
            pdf_path=pdf_path,
            status='generated'
        )
        db.add(statement)
        db.commit()
        return statement


# ============== EMAIL SERVICE ==============

class StatementEmailService:
    """Handle email delivery of statements"""
    
    def __init__(self, mail_app=None):
        self.mail = mail_app
    
    def send_statement(self, recipient_email, recipient_name, statement_data, pdf_buffer, company_settings=None):
        """Send statement via email"""
        from flask_mail import Message
        
        period = datetime(statement_data['statement_period']['year'], 
                         statement_data['statement_period']['month'], 1).strftime('%B %Y')
        
        if company_settings:
            subject = company_settings.statement_email_subject.format(period=period)
        else:
            subject = f"Your Monthly Owner Statement - {period}"
        
        # Build email body
        company_name = statement_data['company']['name']
        property_name = statement_data['property']['name']
        net_amount = statement_data['summary']['net_to_owner']
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Owner Statement - {period}</h2>
            <p>Hello {recipient_name or 'Property Owner'},</p>
            <p>Your monthly statement for <strong>{property_name}</strong> is ready.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Summary</h3>
                <p><strong>Total Income:</strong> ${statement_data['summary']['total_income']:,.2f}</p>
                <p><strong>Total Expenses:</strong> ${statement_data['summary']['total_expenses']:,.2f}</p>
                <p><strong>Management Fee:</strong> ${statement_data['summary']['management_fee']:,.2f}</p>
                <p style="font-size: 1.2em; color: {'#22c55e' if net_amount >= 0 else '#ef4444'};">
                    <strong>Net to Owner: ${net_amount:,.2f}</strong>
                </p>
            </div>
            
            <p>Please find your detailed statement attached as a PDF.</p>
            <p>If you have any questions, please contact us at {statement_data['company']['email']}.</p>
            
            <p>Best regards,<br>{company_name}</p>
        </body>
        </html>
        """
        
        try:
            msg = Message(
                subject=subject,
                recipients=[recipient_email],
                html=html_body,
                sender=statement_data['company']['email']
            )
            
            # Attach PDF
            pdf_buffer.seek(0)
            msg.attach(
                filename=f"owner-statement-{period.replace(' ', '-')}.pdf",
                content_type='application/pdf',
                data=pdf_buffer.getvalue()
            )
            
            self.mail.send(msg)
            return True, None
            
        except Exception as e:
            return False, str(e)


# ============== FLASK ROUTES ==============

from flask import send_file, jsonify, request, after_this_request
from functools import wraps
from flask_cors import cross_origin
import calendar
import os

def init_owner_statement_routes(app, mail=None):
    """Initialize owner statement routes on Flask app"""
    
    generator = OwnerStatementGenerator()
    service = StatementService()
    email_service = StatementEmailService(mail) if mail else None
    
    # Get limiter from app if available
    limiter = app.extensions.get('limiter') if hasattr(app, 'extensions') else None
    
    @app.route('/api/statements/generate', methods=['POST'])
    @cross_origin(supports_credentials=True)
    @login_required
    def generate_statement():
        """Generate a new owner statement PDF"""
        data = request.get_json()
        
        property_id = data.get('property_id')
        month = data.get('month')
        year = data.get('year')
        send_email = data.get('send_email', False)
        
        # Input validation
        if not all([property_id, month, year]):
            return jsonify({'error': 'Missing required fields: property_id, month, year'}), 400
        
        # Validate property_id is integer
        try:
            property_id = int(property_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid property_id'}), 400
        
        # Validate month (1-12)
        try:
            month = int(month)
            if not 1 <= month <= 12:
                return jsonify({'error': 'Month must be between 1 and 12'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid month'}), 400
        
        # Validate year (reasonable range)
        try:
            year = int(year)
            if not 2020 <= year <= 2100:
                return jsonify({'error': 'Invalid year'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid year'}), 400
        
        db = get_db_session()
        try:
            # Fetch property
            prop = db.query(Property).filter_by(
                id=property_id, 
                user_id=current_user.id
            ).first()
            
            if not prop:
                return jsonify({'error': 'Property not found'}), 404
            
            # Get company settings
            company_settings = service.get_or_create_company_settings(db, current_user.id) if MODELS_EXTENDED else None
            
            # Build statement data
            statement_data = service.build_statement_data(db, prop, current_user, month, year, company_settings)
            
            # Generate PDF
            logo_path = None
            if company_settings and company_settings.company_logo_url:
                # Download logo if needed
                logo_path = download_logo(company_settings.company_logo_url)
            
            pdf_buffer = generator.generate_statement(statement_data, logo_path)
            
            # Save to file for record
            filename = f"owner-statement-{prop.id}-{year}-{month:02d}.pdf"
            pdf_dir = os.path.join(current_app.root_path, 'static', 'statements')
            os.makedirs(pdf_dir, exist_ok=True)
            pdf_path = os.path.join(pdf_dir, filename)
            
            with open(pdf_path, 'wb') as f:
                f.write(pdf_buffer.getvalue())
            
            # Save record to database
            statement_record = service.save_statement_record(
                db, current_user.id, prop.id, month, year, statement_data, pdf_path
            )
            
            # Send email if requested
            if send_email and email_service:
                success, error = email_service.send_statement(
                    current_user.email,
                    current_user.first_name,
                    statement_data,
                    pdf_buffer,
                    company_settings
                )
                if success and statement_record:
                    statement_record.email_sent = True
                    statement_record.email_sent_at = datetime.utcnow()
                    statement_record.status = 'sent'
                    db.commit()
            
            # Return PDF
            pdf_buffer.seek(0)
            return send_file(
                pdf_buffer,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=filename
            )
            
        finally:
            db.close()
    
    @app.route('/api/statements/property/<int:property_id>')
    @cross_origin(supports_credentials=True)
    @login_required
    def list_statements(property_id):
        """List available statement periods for a property"""
        db = get_db_session()
        try:
            # Verify property ownership
            prop = db.query(Property).filter_by(
                id=property_id,
                user_id=current_user.id
            ).first()
            
            if not prop:
                return jsonify({'error': 'Property not found'}), 404
            
            # Get payment months for this property
            payments = db.query(Payment).filter(
                Payment.user_id == current_user.id
            ).all()
            
            # Extract unique months
            months = set()
            for payment in payments:
                months.add(payment.for_month)
            
            # Also get expenses if extended model exists
            if MODELS_EXTENDED:
                expenses = db.query(Expense).filter(
                    Expense.user_id == current_user.id,
                    Expense.property_id == property_id
                ).all()
                for expense in expenses:
                    if expense.for_month:
                        months.add(expense.for_month)
            
            # Format response
            statements = []
            for month_str in sorted(months, reverse=True):
                year, month = month_str.split('-')
                statements.append({
                    'month': int(month),
                    'year': int(year),
                    'period': f"{calendar.month_name[int(month)]} {year}"
                })
            
            return jsonify({'statements': statements})
            
        finally:
            db.close()
    
    @app.route('/api/statements/company-settings', methods=['GET', 'POST'])
    @cross_origin(supports_credentials=True)
    @login_required
    def company_settings():
        """Get or update company settings"""
        if not MODELS_EXTENDED:
            return jsonify({'error': 'Company settings not available'}), 503
        
        db = get_db_session()
        try:
            if request.method == 'GET':
                settings = service.get_or_create_company_settings(db, current_user.id)
                return jsonify({
                    'company_name': settings.company_name,
                    'company_address': settings.company_address,
                    'company_city': settings.company_city,
                    'company_state': settings.company_state,
                    'company_zip': settings.company_zip,
                    'company_phone': settings.company_phone,
                    'company_email': settings.company_email,
                    'default_management_fee_percent': settings.default_management_fee_percent,
                    'statement_payment_terms': settings.statement_payment_terms,
                    'auto_send_statements': settings.auto_send_statements,
                    'auto_send_day': settings.auto_send_day
                })
            
            elif request.method == 'POST':
                data = request.get_json()
                settings = service.get_or_create_company_settings(db, current_user.id)
                
                # Update fields
                for field in ['company_name', 'company_address', 'company_city', 
                             'company_state', 'company_zip', 'company_phone', 'company_email',
                             'default_management_fee_percent', 'statement_payment_terms']:
                    if field in data:
                        setattr(settings, field, data[field])
                
                db.commit()
                return jsonify({'success': True, 'message': 'Settings updated'})
                
        finally:
            db.close()
    
    @app.route('/api/expenses', methods=['GET', 'POST'])
    @cross_origin(supports_credentials=True)
    @login_required
    def expenses():
        """List or create expenses"""
        if not MODELS_EXTENDED:
            return jsonify({'error': 'Expense tracking not available'}), 503
        
        db = get_db_session()
        try:
            if request.method == 'GET':
                property_id = request.args.get('property_id')
                month = request.args.get('month')
                year = request.args.get('year')
                
                query = db.query(Expense).filter(Expense.user_id == current_user.id)
                
                if property_id:
                    query = query.filter(Expense.property_id == property_id)
                if month and year:
                    query = query.filter(Expense.for_month == f"{year}-{month}")
                
                expenses = query.order_by(Expense.expense_date.desc()).all()
                
                return jsonify({
                    'expenses': [{
                        'id': e.id,
                        'description': e.description,
                        'category': e.category,
                        'amount': e.amount,
                        'expense_date': e.expense_date.isoformat(),
                        'vendor_name': e.vendor_name,
                        'is_tax_deductible': e.is_tax_deductible
                    } for e in expenses]
                })
            
            elif request.method == 'POST':
                data = request.get_json()
                
                expense = Expense(
                    user_id=current_user.id,
                    property_id=data['property_id'],
                    description=data['description'],
                    category=data['category'],
                    amount=data['amount'],
                    expense_date=datetime.strptime(data['expense_date'], '%Y-%m-%d').date(),
                    for_month=data.get('for_month'),
                    vendor_name=data.get('vendor_name'),
                    is_tax_deductible=data.get('is_tax_deductible', True)
                )
                db.add(expense)
                db.commit()
                
                return jsonify({'success': True, 'expense': {'id': expense.id}}), 201
                
        finally:
            db.close()


def download_logo(logo_url):
    """Download logo from URL to temp file"""
    try:
        import tempfile
        response = requests.get(logo_url, timeout=30)
        if response.status_code == 200:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
            temp_file.write(response.content)
            temp_file.close()
            return temp_file.name
    except Exception as e:
        print(f"Error downloading logo: {e}")
    return None
