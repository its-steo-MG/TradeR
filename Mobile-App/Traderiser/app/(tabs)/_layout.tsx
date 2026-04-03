// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#27272a',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#71717a',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trade"
        options={{
          title: 'New Trade',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size + 6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Performance',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}