import { Tabs } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#0070f3',
      tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 5, backgroundColor: '#fff', borderTopWidth: 0, elevation: 10 },
      headerShown: false
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ title: 'Tổng Quan', tabBarIcon: ({color}) => <Ionicons name="pie-chart" size={24} color={color} /> }} 
      />
      <Tabs.Screen 
        name="orders" 
        options={{ title: 'Lệnh Cấp', tabBarIcon: ({color}) => <MaterialCommunityIcons name="clipboard-text" size={24} color={color} /> }} 
      />
      <Tabs.Screen 
        name="map" 
        options={{ title: 'Vệ Tinh', tabBarIcon: ({color}) => <FontAwesome5 name="map-marked-alt" size={22} color={color} /> }} 
      />
      <Tabs.Screen 
        name="customers" 
        options={{ title: 'Khách Hàng', tabBarIcon: ({color}) => <Ionicons name="people" size={24} color={color} /> }} 
      />
      <Tabs.Screen 
        name="fleet" 
        options={{ title: 'Đội Xe', tabBarIcon: ({color}) => <MaterialCommunityIcons name="truck-outline" size={26} color={color} /> }} 
      />
      
      {/* Ẩn bớt các tab phụ không ưu tiên trên thanh điều hướng dưới */}
      <Tabs.Screen name="logs" options={{ href: null }} />
      <Tabs.Screen name="suppliers" options={{ href: null }} />
    </Tabs>
  );
}
