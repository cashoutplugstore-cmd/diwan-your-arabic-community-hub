import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ديوان</Text>
      <Text style={styles.title}>مرحباً بك في ديوان</Text>
      <Text style={styles.subtitle}>Mobile foundation جاهزة — الخطوة التالية ربط تسجيل الدخول والغرف.</Text>
      <Link href="/auth/login" style={styles.link}>تسجيل الدخول</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0b1020' },
  logo: { fontSize: 42, fontWeight: '800', color: '#fff', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { marginTop: 12, fontSize: 15, lineHeight: 24, color: '#aeb7ca', textAlign: 'center' },
  link: { marginTop: 28, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#fff', color: '#111827', fontWeight: '700' },
});
