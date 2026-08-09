import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Room = { id: string; name: string; description: string | null; slug: string; member_count?: number };

export default function RoomsTab() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from('rooms').select('id,name,description,slug').eq('is_private', false).order('last_activity_at', { ascending: false }).then(({ data }) => {
      if (mounted) { setRooms(data ?? []); setLoading(false); }
    });
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>الغرف 🌍</Text>
      <Text style={styles.subtitle}>اكتشف المجتمعات النشطة في ديوان</Text>
      {loading ? <ActivityIndicator size="large" color="#fff" style={styles.loader} /> : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push({ pathname: '/chat/[roomId]', params: { roomId: item.id, name: item.name } })}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text></View>
              <View style={styles.copy}>
                <Text style={styles.name}>{item.name}</Text>
                {!!item.description && <Text numberOfLines={1} style={styles.description}>{item.description}</Text>}
              </View>
              <Text style={styles.chevron}>‹</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>لا توجد غرف عامة حالياً.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020', paddingTop: 64, paddingHorizontal: 18 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'right' },
  subtitle: { color: '#8994aa', fontSize: 14, marginTop: 6, textAlign: 'right' },
  loader: { marginTop: 50 },
  list: { paddingVertical: 20, gap: 10 },
  card: { minHeight: 76, borderRadius: 18, backgroundColor: '#151d31', flexDirection: 'row-reverse', alignItems: 'center', padding: 13 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#27334e', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 21, fontWeight: '900' },
  copy: { flex: 1, marginHorizontal: 12 },
  name: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  description: { color: '#8994aa', marginTop: 4, textAlign: 'right' },
  chevron: { color: '#7d879b', fontSize: 26, transform: [{ rotate: '180deg' }] },
  empty: { color: '#8994aa', textAlign: 'center', marginTop: 50 },
});
