import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Room = { id: string; name: string; slug: string; description: string | null; member_count?: number };

export default function RoomsScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRooms() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('rooms').select('id,name,slug,description').eq('is_private', false).order('last_activity_at', { ascending: false });
    if (error) setError(error.message);
    setRooms(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadRooms(); }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>الغرف</Text>
      <Text style={styles.subtitle}>مجتمعات ديوان النشطة</Text>
      {loading ? <ActivityIndicator size="large" /> : error ? <Text style={styles.error}>{error}</Text> : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={loadRooms}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>لا توجد غرف متاحة حالياً.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push({ pathname: '/rooms/[slug]', params: { slug: item.slug } })}>
              <View style={styles.icon}><Text style={styles.iconText}>💬</Text></View>
              <View style={styles.body}>
                <Text style={styles.name}>{item.name}</Text>
                {!!item.description && <Text style={styles.description} numberOfLines={2}>{item.description}</Text>}
              </View>
              <Text style={styles.arrow}>‹</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020', paddingTop: 64, paddingHorizontal: 18 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', textAlign: 'right' },
  subtitle: { color: '#9aa5bb', fontSize: 15, marginTop: 6, marginBottom: 20, textAlign: 'right' },
  list: { paddingBottom: 24, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#151d31', borderRadius: 18, padding: 15, gap: 12 },
  icon: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#202a43' },
  iconText: { fontSize: 23 },
  body: { flex: 1 },
  name: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'right' },
  description: { color: '#8f9ab0', marginTop: 4, textAlign: 'right' },
  arrow: { color: '#aeb7ca', fontSize: 28 },
  empty: { color: '#9aa5bb', textAlign: 'center', marginTop: 50 },
  error: { color: '#ff8f8f', textAlign: 'center', marginTop: 40 },
});
