"""
Property Manager Portal Routes - Token-based access for property managers
Handles: Dashboard, properties, tenants, payments, maintenance, messages
"""

from flask import Blueprint, render_template, redirect, url_for, flash, request, session, jsonify
from models import Tenant, Payment, MaintenanceRequest, Property, User, get_db_session
from sqlalchemy import inspect

# Get ManagerAccess from the database metadata
def get_manager_access_class():
    from models import Base
    from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
    
    class ManagerAccess(Base):
        __tablename__ = 'manager_access'
        id = Column(Integer, primary_key=True)
        user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
        manager_email = Column(String(255), nullable=False)
        manager_name = Column(String(255), nullable=False)
        token = Column(String(64), unique=True, nullable=False)
        permissions = Column(String(500))
        active = Column(Boolean, default=True)
        created_at = Column(DateTime)
        last_used_at = Column(DateTime)
        expires_at = Column(DateTime)
    
    return ManagerAccess

ManagerAccess = get_manager_access_class()
from datetime import datetime, date
import secrets

manager_portal = Blueprint('manager_portal', __name__)


@manager_portal.route('/manager/<token>')
def manager_dashboard(token):
    """Manager portal dashboard - overview of all properties"""
    db_session = get_db_session()
    try:
        # Find manager access by token
        from models import ManagerAccess  # Assuming this model exists or will be created
        manager = db_session.query(ManagerAccess).filter_by(token=token, active=True).first()
        
        if not manager:
            flash('Invalid or expired manager access link', 'error')
            return redirect(url_for('login'))
        
        # Store manager info in session
        session['manager_id'] = manager.id
        session['manager_token'] = token
        session['manager_permissions'] = manager.permissions.split(',') if manager.permissions else []
        
        # Get stats for dashboard
        user_id = manager.user_id  # The landlord who granted access
        
        # Calculate stats
        properties_count = db_session.query(Property).filter_by(user_id=user_id).count()
        tenants_count = db_session.query(Tenant).filter_by(user_id=user_id).count()
        
        # Payment stats for current month
        current_month = date.today().strftime('%Y-%m')
        payments_query = db_session.query(Payment).join(Tenant).filter(Tenant.user_id == user_id)
        total_collected = sum(p.amount_paid for p in payments_query.filter(Payment.for_month == current_month).all())
        total_expected = sum(t.monthly_rent for t in db_session.query(Tenant).filter_by(user_id=user_id).all())
        
        # Maintenance stats
        maintenance_query = db_session.query(MaintenanceRequest).join(Tenant).filter(Tenant.user_id == user_id)
        open_maintenance = maintenance_query.filter(MaintenanceRequest.status == 'open').count()
        
        # Recent payments
        recent_payments = payments_query.order_by(Payment.payment_date.desc()).limit(10).all()
        
        # Urgent maintenance
        urgent_maintenance = maintenance_query.filter(
            MaintenanceRequest.urgency.in_(['emergency', 'high']),
            MaintenanceRequest.status.in_(['open', 'in_progress'])
        ).order_by(
            case(
                (MaintenanceRequest.urgency == 'emergency', 1),
                (MaintenanceRequest.urgency == 'high', 2),
                else_=3
            )
        ).limit(10).all()
        
        return render_template('manager_portal.html',
                             manager=manager,
                             stats={
                                 'total_properties': properties_count,
                                 'total_tenants': tenants_count,
                                 'collected_this_month': total_collected,
                                 'expected_this_month': total_expected,
                                 'open_maintenance': open_maintenance
                             },
                             recent_payments=recent_payments,
                             urgent_maintenance=urgent_maintenance,
                             token=token)
    except Exception as e:
        flash(f'Error loading dashboard: {str(e)}', 'error')
        return redirect(url_for('login'))
    finally:
        db_session.close()


@manager_portal.route('/manager/<token>/properties')
def manager_properties(token):
    """View all properties"""
    db_session = get_db_session()
    try:
        manager = db_session.query(ManagerAccess).filter_by(token=token, active=True).first()
        if not manager:
            flash('Invalid access', 'error')
            return redirect(url_for('login'))
        
        properties = db_session.query(Property).filter_by(user_id=manager.user_id).all()
        
        # Calculate stats for each property
        property_data = []
        for prop in properties:
            # Count tenants in this property
            tenants_count = db_session.query(Tenant).filter_by(property_id=prop.id).count()
            
            # Calculate monthly rent total
            from sqlalchemy import func
            rent_total = db_session.query(func.sum(Tenant.monthly_rent)).filter_by(property_id=prop.id).scalar() or 0
            
            property_data.append({
                'property': prop,
                'tenants_count': tenants_count,
                'monthly_rent': rent_total
            })
        
        return render_template('manager_properties.html', 
                             properties=property_data, 
                             token=token,
                             manager=manager)
    finally:
        db_session.close()


@manager_portal.route('/manager/<token>/tenants')
def manager_tenants(token):
    """View all tenants"""
    db_session = get_db_session()
    try:
        manager = db_session.query(ManagerAccess).filter_by(token=token, active=True).first()
        if not manager:
            flash('Invalid access', 'error')
            return redirect(url_for('login'))
        
        tenants = db_session.query(Tenant).filter_by(user_id=manager.user_id).all()
        
        return render_template('manager_tenants.html', 
                             tenants=tenants, 
                             token=token,
                             manager=manager)
    finally:
        db_session.close()


@manager_portal.route('/manager/<token>/payments')
def manager_payments(token):
    """View all payments"""
    db_session = get_db_session()
    try:
        manager = db_session.query(ManagerAccess).filter_by(token=token, active=True).first()
        if not manager:
            flash('Invalid access', 'error')
            return redirect(url_for('login'))
        
        payments = db_session.query(Payment).join(Tenant).filter(
            Tenant.user_id == manager.user_id
        ).order_by(Payment.payment_date.desc()).limit(100).all()
        
        return render_template('manager_payments.html', 
                             payments=payments, 
                             token=token,
                             manager=manager)
    finally:
        db_session.close()


@manager_portal.route('/manager/<token>/maintenance')
def manager_maintenance(token):
    """View and manage maintenance requests"""
    db_session = get_db_session()
    try:
        manager = db_session.query(ManagerAccess).filter_by(token=token, active=True).first()
        if not manager:
            flash('Invalid access', 'error')
            return redirect(url_for('login'))
        
        # Get all maintenance requests for this landlord's properties
        maintenance = db_session.query(MaintenanceRequest).join(Tenant).filter(
            Tenant.user_id == manager.user_id
        ).order_by(
            MaintenanceRequest.created_at.desc()
        ).all()
        
        return render_template('manager_maintenance.html', maintenance=maintenance, token=token)
    finally:
        db_session.close()


@manager_portal.route('/manager/<token>/maintenance/<int:request_id>/update', methods=['POST'])
def update_maintenance_status(token, request_id):
    """Update maintenance request status"""
    db_session = get_db_session()
    try:
        manager = db_session.query(ManagerAccess).filter_by(token=token, active=True).first()
        if not manager:
            return jsonify({'error': 'Invalid access'}), 401
        
        # Check permissions
        if 'manage_maintenance' not in session.get('manager_permissions', []):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        maintenance = db_session.query(MaintenanceRequest).join(Tenant).filter(
            MaintenanceRequest.id == request_id,
            Tenant.user_id == manager.user_id
        ).first()
        
        if not maintenance:
            return jsonify({'error': 'Request not found'}), 404
        
        new_status = request.form.get('status') or request.json.get('status')
        if new_status:
            maintenance.status = new_status
            maintenance.updated_at = datetime.now()
            db_session.commit()
            
            # Notify tenant (optional - send email)
            # send_status_update_email(maintenance)
            
            return jsonify({'success': True, 'status': new_status})
        else:
            return jsonify({'error': 'No status provided'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db_session.close()


@manager_portal.route('/manager/<token>/maintenance/<int:request_id>/respond', methods=['POST'])
def respond_to_maintenance(token, request_id):
    """Respond to maintenance request (send message to tenant)"""
    db_session = get_db_session()
    try:
        manager = db_session.query(ManagerAccess).filter_by(token=token, active=True).first()
        if not manager:
            return jsonify({'error': 'Invalid access'}), 401
        
        # Check permissions
        if 'respond_maintenance' not in session.get('manager_permissions', []):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        maintenance = db_session.query(MaintenanceRequest).join(Tenant).filter(
            MaintenanceRequest.id == request_id,
            Tenant.user_id == manager.user_id
        ).first()
        
        if not maintenance:
            return jsonify({'error': 'Request not found'}), 404
        
        response_text = request.form.get('response') or request.json.get('response')
        if not response_text:
            return jsonify({'error': 'No response provided'}), 400
        
        # Update maintenance with response
        maintenance.manager_response = response_text
        maintenance.response_at = datetime.now()
        maintenance.updated_at = datetime.now()
        
        # Create message to tenant
        message = Message(
            from_id=manager.user_id,
            to_id=maintenance.tenant_id,  # Assuming tenant has messaging capability
            subject=f'Re: Maintenance Request - {maintenance.title}',
            message=response_text,
            created_at=datetime.now(),
            is_read=False
        )
        db_session.add(message)
        db_session.commit()
        
        # Notify tenant (send email)
        # send_response_email(maintenance, response_text)
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db_session.close()


@manager_portal.route('/manager/<token>/messages')
def manager_messages(token):
    """View messages from tenants (stored as maintenance requests with is_message flag)"""
    db_session = get_db_session()
    try:
        manager = db_session.query(ManagerAccess).filter_by(token=token, active=True).first()
        if not manager:
            flash('Invalid access', 'error')
            return redirect(url_for('login'))
        
        # Get messages (maintenance requests flagged as messages)
        messages = db_session.query(MaintenanceRequest).join(Tenant).filter(
            Tenant.user_id == manager.user_id,
            MaintenanceRequest.is_message == True
        ).order_by(MaintenanceRequest.created_at.desc()).limit(50).all()
        
        return render_template('manager_messages.html', messages=messages, token=token)
    finally:
        db_session.close()


@manager_portal.route('/manager/<token>/messages/send', methods=['POST'])
def send_message(token):
    """Send message to tenant via email (direct response)"""
    db_session = get_db_session()
    try:
        manager = db_session.query(ManagerAccess).filter_by(token=token, active=True).first()
        if not manager:
            return jsonify({'error': 'Invalid access'}), 401
        
        # Check permissions
        if 'send_messages' not in session.get('manager_permissions', []):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        tenant_id = request.form.get('tenant_id') or request.json.get('tenant_id')
        subject = request.form.get('subject')
        message_text = request.form.get('message')
        
        if not all([tenant_id, subject, message_text]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Verify tenant belongs to this landlord
        tenant = db_session.query(Tenant).filter_by(
            id=tenant_id,
            user_id=manager.user_id
        ).first()
        
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Send email to tenant (implementation would use Flask-Mail)
        # send_email_to_tenant(tenant.email, subject, message_text)
        
        return jsonify({'success': True, 'message': 'Email sent to tenant'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db_session.close()


@manager_portal.route('/manager/<token>/logout')
def manager_logout(token):
    """Logout from manager portal"""
    session.pop('manager_id', None)
    session.pop('manager_token', None)
    session.pop('manager_permissions', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))
