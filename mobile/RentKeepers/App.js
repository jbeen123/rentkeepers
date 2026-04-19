import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import Verify2FAScreen from './src/screens/Verify2FAScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TenantsScreen from './src/screens/TenantsScreen';

// Auth Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Simple placeholder screens
function AddPaymentScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>💵 Add Payment</Text>
      <Text style={styles.placeholderSub}>Coming soon...</Text>
    </View>
  );
}

function ReportsScreen() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>📊 Reports</Text>
      <Text style={styles.placeholderSub}>Coming soon...</Text>
    </View>
  );
}

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.6 }}>
      {emoji}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e9ecef',
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Tenants"
        component={TenantsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddPaymentScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="➕" focused={focused} />,
          tabBarLabel: 'Payment',
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function NavigationRoot() {
  const { isAuthenticated, requires2FA } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Verify2FA" component={Verify2FAScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationRoot />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderSub: {
    fontSize: 16,
    color: '#6c757d',
  },
});
