import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Message = { id: string; content: string; user_id: string; created_at: string };

export default function RoomChatScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('الغرفة');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: auth }, { data: room }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('rooms').select('id,name').eq('slug', slug).maybeSingle(),
      ]);
      if (!mounted) return;
      setUserId(auth.user?.id ?? null);
      if (!room) { setLoading(false); return; }
      setRoomId(room.id);
      setRoomName(room.name);
      const { data } = await supabase.from('messages').select('id,content,user_id,created_at').eq('room_id', room.id).order('created_at', { ascending: true }).limit(100);
      if (mounted) { setMessages(data ?? []); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [slug]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`mobile-room-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        setMessages((current) => current.some((m) => m.id === payload.new.id) ? current : [...current, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  async function send() {
    const content = text.trim();
    if (!content || !roomId || !userId) return;
    setText('');
    const { error } = await supabase.from('messages').insert({ room_id: roomId, user_id: userId, content });
    if (error) setText(content);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (!roomId) return <View style={styles.center}><Text style={styles.error}>الغرفة غير موجودة.</Text></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}><Text style={styles.headerTitle}>{roomName}</Text><Text style={styles.live}>● مباشر</Text></View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.user_id === userId && styles.mine]}><Text style={styles.message}>{item.content}</Text></View>
        )}
      />
      <View style={styles.composer}>
        <TextInput value={text} onChangeText={setText} placeholder="اكتب رسالتك..." placeholderTextColor="#7d879b" style={styles.input} textAlign="right" multiline />
        <Pressable onPress={send} style={styles.send}><Text style={styles.sendText}>إرسال</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1020' },
  error: { color: '#ff8f8f', fontSize: 16 },
  header: { paddingTop: 58, paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#202a3d', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  live: { color: '#79e2a7', fontSize: 12 },
  messages: { padding: 16, gap: 9 },
  bubble: { alignSelf: 'flex-start', maxWidth: '82%', backgroundColor: '#172139', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#263555' },
  message: { color: '#fff', fontSize: 15, lineHeight: 22 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#202a3d' },
  input: { flex: 1, maxHeight: 110, minHeight: 48, backgroundColor: '#151d31', color: '#fff', borderRadius: 15, paddingHorizontal: 14, paddingVertical: 12 },
  send: { height: 48, paddingHorizontal: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  sendText: { color: '#111827', fontWeight: '800' },
});
