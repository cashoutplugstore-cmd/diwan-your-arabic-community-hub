import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const items = [
  { name: 'index', label: 'الرئيسية', icon: 'home-outline', active: 'home' },
  { name: 'rooms', label: 'الغرف', icon: 'chatbubbles-outline', active: 'chatbubbles' },
  { name: 'notifications', label: 'التنبيهات', icon: 'notifications-outline', active: 'notifications' },
  { name: 'friends', label: 'الأصدقاء', icon: 'people-outline', active: 'people' },
  { name: 'profile', label: 'حسابي', icon: 'person-outline', active: 'person' },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#7d879b',
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: '#11182a',
          borderTopColor: '#202a40',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      {items.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: item.label,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? item.active : item.icon} size={23} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
