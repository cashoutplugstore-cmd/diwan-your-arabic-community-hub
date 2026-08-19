import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Room = { id: string; name: string; description: string | null; slug: string };

export default function HomeTab() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      supabase.auth.getUser(),
      supabase.from('rooms').select('id,name,description,slug').eq('is_private', false).order('last_activity_at', { ascending: false }).limit(6),
    ]).then(([userResult, roomsResult]) => {
      if (!mounted) return;
      setEmail(userResult.data.user?.email ?? null);
      setRooms(roomsResult.data ?? []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>هلا بيك 👋</Text>
            <Text style={styles.username}>{email ? email.split('@')[0] : 'ضيف ديوان'}</Text>
          </View>
          <Pressable style={styles.bell} onPress={() => router.push('/(tabs)/notifications')}>
            <Ionicons name="notifications-outline" size={23} color="#fff" />
            <View style={styles.dot} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="sparkles" size={25} color="#fff" /></View>
          <Text style={styles.heroTitle}>اكتشف ديوان</Text>
          <Text style={styles.heroText}>مجتمعات، غرف ومحادثات عربية بانتظارك.</Text>
          <Pressable style={styles.heroButton} onPress={() => router.push('/(tabs)/rooms')}>
            <Text style={styles.heroButtonText}>استكشف الغرف</Text>
            <Ionicons name="arrow-back" size={18} color="#111827" />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Pressable onPress={() => router.push('/(tabs)/rooms')}><Text style={styles.more}>عرض الكل</Text></Pressable>
          <Text style={styles.sectionTitle}>الغرف النشطة 🔥</Text>
        </View>

        {loading ? <ActivityIndicator color="#fff" style={{ marginTop: 25 }} /> : (
          <FlatList
            horizontal
            inverted
            data={rooms}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rooms}
            renderItem={({ item }) => (
              <Pressable style={styles.roomCard} onPress={() => router.push({ pathname: '/chat/[roomId]', params: { roomId: item.id, name: item.name } })}>
                <View style={styles.roomIcon}><Text style={styles.roomInitial}>{item.name.slice(0, 1)}</Text></View>
                <Text numberOfLines={1} style={styles.roomName}>{item.name}</Text>
                <Text style={styles.roomLive}>● نشطة الآن</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>لا توجد غرف نشطة حالياً.</Text>}
          />
        )}

        <Text style={styles.sectionTitleBottom}>الوصول السريع</Text>
        <View style={styles.quickGrid}>
          <Pressable style={styles.quick} onPress={() => router.push('/(tabs)/friends')}><Ionicons name="people-outline" size={24} color="#fff" /><Text style={styles.quickText}>الأصدقاء</Text></Pressable>
          <Pressable style={styles.quick} onPress={() => router.push('/(tabs)/notifications')}><Ionicons name="notifications-outline" size={24} color="#fff" /><Text style={styles.quickText}>التنبيهات</Text></Pressable>
          <Pressable style={styles.quick} onPress={() => router.push('/(tabs)/profile')}><Ionicons name="person-outline" size={24} color="#fff" /><Text style={styles.quickText}>حسابي</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020' },
  content: { paddingTop: 58, paddingHorizontal: 18, paddingBottom: 105 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: '#8d98ae', fontSize: 14, textAlign: 'right' },
  username: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 3, textAlign: 'right' },
  bell: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#151d31', alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 5, backgroundColor: '#fff' },
  hero: { marginTop: 22, borderRadius: 26, padding: 20, backgroundColor: '#18233a' },
  heroIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#263551', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { color: '#fff', fontSize: 25, fontWeight: '900', textAlign: 'right' },
  heroText: { color: '#aeb7ca', fontSize: 14, lineHeight: 22, marginTop: 6, textAlign: 'right' },
  heroButton: { marginTop: 17, alignSelf: 'flex-end', flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 13 },
  heroButtonText: { color: '#111827', fontWeight: '800' },
  sectionHeader: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 19, fontWeight: '900', textAlign: 'right' },
  more: { color: '#9da8bd', fontSize: 13, fontWeight: '700' },
  rooms: { paddingVertical: 15, gap: 12 },
  roomCard: { width: 145, height: 155, borderRadius: 20, backgroundColor: '#151d31', padding: 15, justifyContent: 'flex-end' },
  roomIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#27334e', alignItems: 'center', justifyContent: 'center', marginBottom: 'auto' },
  roomInitial: { color: '#fff', fontSize: 21, fontWeight: '900' },
  roomName: { color: '#fff', fontSize: 15, fontWeight: '800', textAlign: 'right' },
  roomLive: { color: '#8d98ae', fontSize: 11, marginTop: 5, textAlign: 'right' },
  empty: { color: '#8994aa', padding: 25, textAlign: 'center' },
  sectionTitleBottom: { color: '#fff', fontSize: 19, fontWeight: '900', textAlign: 'right', marginTop: 18, marginBottom: 13 },
  quickGrid: { flexDirection: 'row-reverse', gap: 10 },
  quick: { flex: 1, minHeight: 92, borderRadius: 18, backgroundColor: '#151d31', alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickText: { color: '#c5ccda', fontSize: 12, fontWeight: '700' },
});
