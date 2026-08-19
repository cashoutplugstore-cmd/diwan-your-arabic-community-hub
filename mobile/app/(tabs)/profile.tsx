import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function ProfileTab() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)); }, []);
  return <View style={styles.container}><Text style={styles.title}>حسابي 👤</Text><View style={styles.card}>{email ? <><Text style={styles.label}>الحساب</Text><Text style={styles.email}>{email}</Text></> : <ActivityIndicator color="#fff" />}</View></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0b1020', paddingTop: 64, paddingHorizontal: 20 }, title: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'right', marginBottom: 20 }, card: { backgroundColor: '#151d31', borderRadius: 20, padding: 20 }, label: { color: '#8994aa', textAlign: 'right', marginBottom: 8 }, email: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'right' } });
