// app/(tabs)/trade.tsx
import { View, Text } from 'react-native';

export default function NewTrade() {
  return (
    <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
      <Text className="text-white text-2xl">New Trade Entry</Text>
      <Text className="text-zinc-400 mt-4">Coming soon...</Text>
    </View>
  );
}