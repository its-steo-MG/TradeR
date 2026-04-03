// app/(tabs)/dashboard.tsx
import { View, Text, ScrollView } from 'react-native';

export default function Dashboard() {
  return (
    <ScrollView className="flex-1 bg-[#0a0a0a] px-4 pt-12">
      <Text className="text-white text-3xl font-bold mb-8">Traderiser</Text>
      
      <View className="bg-[#121212] rounded-2xl p-6 mb-6">
        <Text className="text-zinc-400 text-sm">Total PnL</Text>
        <Text className="text-4xl font-bold text-[#22c55e] mt-2">+$2,847.50</Text>
        <Text className="text-emerald-400 text-sm mt-1">+18.4% this month</Text>
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1 bg-[#121212] rounded-2xl p-5">
          <Text className="text-zinc-400 text-sm">Win Rate</Text>
          <Text className="text-3xl font-bold text-white mt-2">68%</Text>
        </View>
        <View className="flex-1 bg-[#121212] rounded-2xl p-5">
          <Text className="text-zinc-400 text-sm">Total Trades</Text>
          <Text className="text-3xl font-bold text-white mt-2">142</Text>
        </View>
      </View>
    </ScrollView>
  );
}