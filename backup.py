"""
Automated backup and sync system for RentKeepers
Handles cloud storage, data portability, and disaster recovery
"""

import json
import os
import gzip
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from models import get_db_session, User, Tenant, Payment
import boto3
from botocore.exceptions import ClientError

class BackupManager:
    """Handle data backup, restore, and sync operations"""
    
    def __init__(self):
        self.s3_bucket = os.getenv('AWS_S3_BACKUP_BUCKET')
        self.s3_client = None
        if self.s3_bucket:
            self.s3_client = boto3.client('s3')
    
    def export_user_data(self, user_id, format='json'):
        """Export all user data to portable format"""
        db = get_db_session()
        
        try:
            user = db.query(User).get(user_id)
            if not user:
                return None
            
            # Gather all user data
            data = {
                'export_metadata': {
                    'version': '1.0',
                    'exported_at': datetime.utcnow().isoformat(),
                    'user_email': user.email,
                    'tenant_count': len(user.tenants)
                },
                'user': {
                    'email': user.email,
                    'first_name': user.first_name,
                    'subscription_tier': user.subscription_tier,
                    'reminder_enabled': user.reminder_enabled,
                    'reminder_days_before': user.reminder_days_before,
                    'reminder_time': user.reminder_time
                },
                'tenants': [],
                'payments': []
            }
            
            # Export tenants
            for tenant in user.tenants:
                tenant_data = {
                    'id': tenant.id,
                    'name': tenant.name,
                    'property_address': tenant.property_address,
                    'monthly_rent': tenant.monthly_rent,
                    'due_day': tenant.due_day,
                    'phone': tenant.phone,
                    'email': tenant.email,
                    'lease_start': tenant.lease_start.isoformat() if tenant.lease_start else None,
                    'lease_end': tenant.lease_end.isoformat() if tenant.lease_end else None,
                    'security_deposit': tenant.security_deposit,
                    'portal_enabled': tenant.portal_enabled,
                    'created_at': tenant.created_at.isoformat() if tenant.created_at else None
                }
                data['tenants'].append(tenant_data)
                
                # Export payments for this tenant
                for payment in tenant.payments:
                    payment_data = {
                        'id': payment.id,
                        'tenant_id': payment.tenant_id,
                        'amount_paid': payment.amount_paid,
                        'for_month': payment.for_month,
                        'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
                        'payment_method': payment.payment_method,
                        'notes': payment.notes
                    }
                    data['payments'].append(payment_data)
            
            db.close()
            
            if format == 'json':
                return json.dumps(data, indent=2, default=str)
            elif format == 'gz':
                return gzip.compress(json.dumps(data, default=str).encode())
            
            return data
            
        except Exception as e:
            print(f"Export error: {e}")
            db.close()
            return None
    
    def import_user_data(self, user_id, data_json, merge=False):
        """Import data from JSON backup"""
        db = get_db_session()
        
        try:
            data = json.loads(data_json)
            user = db.query(User).get(user_id)
            
            if not user:
                return {'success': False, 'error': 'User not found'}
            
            imported = {'tenants': 0, 'payments': 0, 'errors': []}
            
            # Clear existing data if not merging
            if not merge:
                db.query(Payment).filter_by(user_id=user_id).delete()
                db.query(Tenant).filter_by(user_id=user_id).delete()
            
            # Import tenants
            tenant_id_map = {}  # Map old IDs to new IDs
            for tenant_data in data.get('tenants', []):
                try:
                    old_id = tenant_data.get('id')
                    
                    # Check for duplicates if merging
                    if merge:
                        existing = db.query(Tenant).filter_by(
                            user_id=user_id,
                            name=tenant_data.get('name'),
                            property_address=tenant_data.get('property_address')
                        ).first()
                        if existing:
                            tenant_id_map[old_id] = existing.id
                            continue
                    
                    tenant = Tenant(
                        user_id=user_id,
                        name=tenant_data.get('name'),
                        property_address=tenant_data.get('property_address'),
                        monthly_rent=tenant_data.get('monthly_rent', 0),
                        due_day=tenant_data.get('due_day', 1),
                        phone=tenant_data.get('phone', ''),
                        email=tenant_data.get('email', ''),
                        lease_start=tenant_data.get('lease_start'),
                        lease_end=tenant_data.get('lease_end'),
                        security_deposit=tenant_data.get('security_deposit', 0),
                        portal_enabled=False  # Reset for security
                    )
                    db.add(tenant)
                    db.flush()  # Get the new ID
                    tenant_id_map[old_id] = tenant.id
                    imported['tenants'] += 1
                    
                except Exception as e:
                    imported['errors'].append(f"Tenant {tenant_data.get('name')}: {str(e)}")
            
            db.commit()
            
            # Import payments
            for payment_data in data.get('payments', []):
                try:
                    old_tenant_id = payment_data.get('tenant_id')
                    new_tenant_id = tenant_id_map.get(old_tenant_id)
                    
                    if new_tenant_id:
                        payment = Payment(
                            tenant_id=new_tenant_id,
                            user_id=user_id,
                            amount_paid=payment_data.get('amount_paid', 0),
                            for_month=payment_data.get('for_month'),
                            payment_date=payment_data.get('payment_date'),
                            payment_method=payment_data.get('payment_method', 'Cash'),
                            notes=payment_data.get('notes', '')
                        )
                        db.add(payment)
                        imported['payments'] += 1
                        
                except Exception as e:
                    imported['errors'].append(f"Payment import error: {str(e)}")
            
            db.commit()
            return {'success': True, 'imported': imported}
            
        except json.JSONDecodeError as e:
            return {'success': False, 'error': f'Invalid JSON: {str(e)}'}
        except Exception as e:
            db.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            db.close()
    
    def backup_to_s3(self, user_id):
        """Backup user data to S3"""
        if not self.s3_client:
            return {'success': False, 'error': 'S3 not configured'}
        
        try:
            data = self.export_user_data(user_id, format='gz')
            if not data:
                return {'success': False, 'error': 'Export failed'}
            
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            key = f"backups/user_{user_id}/backup_{timestamp}.json.gz"
            
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=key,
                Body=data,
                Metadata={'user-id': str(user_id), 'timestamp': timestamp}
            )
            
            return {'success': True, 'key': key}
            
        except ClientError as e:
            return {'success': False, 'error': str(e)}
    
    def list_backups(self, user_id, limit=10):
        """List available backups for user"""
        if not self.s3_client:
            return []
        
        try:
            prefix = f"backups/user_{user_id}/"
            response = self.s3_client.list_objects_v2(
                Bucket=self.s3_bucket,
                Prefix=prefix,
                MaxKeys=limit
            )
            
            backups = []
            for obj in response.get('Contents', []):
                backups.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'created': obj['LastModified'].isoformat()
                })
            
            return backups
            
        except ClientError:
            return []
    
    def restore_from_s3(self, user_id, backup_key):
        """Restore data from S3 backup"""
        if not self.s3_client:
            return {'success': False, 'error': 'S3 not configured'}
        
        try:
            response = self.s3_client.get_object(
                Bucket=self.s3_bucket,
                Key=backup_key
            )
            
            compressed_data = response['Body'].read()
            data_json = gzip.decompress(compressed_data).decode()
            
            return self.import_user_data(user_id, data_json)
            
        except ClientError as e:
            return {'success': False, 'error': str(e)}


class DataSync:
    """Real-time sync and conflict resolution"""
    
    @staticmethod
    def get_sync_status(user_id, last_sync_timestamp=None):
        """Get changes since last sync"""
        db = get_db_session()
        
        try:
            changes = {
                'tenants': {'added': [], 'modified': [], 'deleted': []},
                'payments': {'added': [], 'modified': [], 'deleted': []},
                'timestamp': datetime.utcnow().isoformat()
            }
            
            if last_sync_timestamp:
                last_sync = datetime.fromisoformat(last_sync_timestamp)
                
                # Get modified tenants
                modified_tenants = db.query(Tenant).filter(
                    Tenant.user_id == user_id,
                    Tenant.updated_at > last_sync
                ).all()
                
                for tenant in modified_tenants:
                    changes['tenants']['modified'].append({
                        'id': tenant.id,
                        'name': tenant.name,
                        'updated_at': tenant.updated_at.isoformat()
                    })
            
            db.close()
            return changes
            
        except Exception as e:
            db.close()
            return {'error': str(e)}


# Scheduled backup job
def run_scheduled_backups():
    """Run daily backups for all premium users"""
    backup_mgr = BackupManager()
    
    db = get_db_session()
    premium_users = db.query(User).filter(
        User.subscription_tier.in_(['monthly', 'yearly', 'lifetime'])
    ).all()
    
    for user in premium_users:
        result = backup_mgr.backup_to_s3(user.id)
        if result['success']:
            print(f"Backed up user {user.id}")
        else:
            print(f"Backup failed for user {user.id}: {result['error']}")
    
    db.close()

if __name__ == '__main__':
    # Test backup
    backup = BackupManager()
    print("Backup system initialized")