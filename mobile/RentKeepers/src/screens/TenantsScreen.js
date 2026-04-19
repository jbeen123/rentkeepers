import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';

const MOCK_TENANTS = [
  { id: 1, name: 'John Smith', property: '123 Main St', rent: 1200, status: 'paid', dueDay: 1 },
  { id: 2, name: 'Sarah Johnson', property: '456 Oak Ave', rent: 1500, status: 'pending', dueDay: 5 },
  { id: 3, name: 'Mike Brown', property: '789 Pine Rd', rent: 1100, status: 'paid', dueDay: 1 },
  { id: 4, name: 'Emily Davis', property: '321 Elm St', rent: 1800, status: 'late', dueDay: 1 },
  { id: 5, name: 'Chris Wilson', property: '654 Maple Dr', rent: 950, status: 'pending', dueDay: 10 },
];

export default function TenantsScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredTenants = MOCK_TENANTS.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tenant.property.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || tenant.status === filter;
    return matchesSearch && matchesFilter;
  });

  function getStatusIcon(status) {
    switch (status) {
      case 'paid': return '✅';
      case 'pending': return '⏳';
      case 'late': return '⚠️';
      default: return '❓';
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'paid': return '#27ae60';
      case 'pending': return '#f39c12';
      case 'late': return '#e74c3c';
      default: return '#6c757d';
    }
  }

  function renderTenant({ item }) {
    return (
      <TouchableOpacity 
        style={styles.tenantCard}
        onPress={() => navigation.navigate('TenantDetail', { tenant: item })}
      >
        <View style={styles.tenantHeader}>
          <Text style={styles.tenantName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}\n>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.tenantDetails}>
          <Text style={styles.detailText}>🏠 {item.property}</Text>
          <Text style={styles.detailText}>💰 ${item.rent}/month</Text>
          <Text style={styles.detailText}>📅 Due: {item.dueDay === 1 ? '1st' : item.dueDay + 'th'}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 Tenants</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddTenant')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tenants..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        {['all', 'paid', 'pending', 'late'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}\n>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTenants}
        renderItem={renderTenant}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
  },
  filterButtonActive: {
    backgroundColor: '#2c3e50',
  },
  filterText: {
    color: '#6c757d',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  tenantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tenantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tenantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  tenantDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6c757d',
  },
});
