import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSignedIn(Boolean(data.session)); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ديوان</Text>
      <Text style={styles.title}>مجتمعك، الآن على الموبايل</Text>
      <Text style={styles.subtitle}>غرف حقيقية، رسائل لحظية، وتجربة عربية من البداية.</Text>
      {signedIn ? (
        <Pressable style={styles.button} onPress={() => router.push('/rooms')}><Text style={styles.buttonText}>دخول إلى الغرف</Text></Pressable>
      ) : (
        <Pressable style={styles.button} onPress={() => router.push('/auth/login')}><Text style={styles.buttonText}>تسجيل الدخول</Text></Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1020' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0b1020' },
  logo: { fontSize: 48, fontWeight: '900', color: '#fff', marginBottom: 18 },
  title: { fontSize: 25, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { marginTop: 12, fontSize: 15, lineHeight: 24, color: '#aeb7ca', textAlign: 'center' },
  button: { marginTop: 28, minWidth: 190, height: 54, paddingHorizontal: 22, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  buttonText: { color: '#111827', fontSize: 16, fontWeight: '800' },
});
