import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: 'Items',
        }}
      />
      <Tabs.Screen
        name="event/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="addEvent"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="addItem"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
