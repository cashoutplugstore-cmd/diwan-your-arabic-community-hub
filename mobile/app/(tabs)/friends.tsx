import { StyleSheet, Text, View } from 'react-native';

export default function FriendsTab() {
  return <View style={styles.container}><Text style={styles.title}>الأصدقاء 👥</Text><Text style={styles.empty}>قائمة الأصدقاء ستظهر هنا.</Text></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0b1020', paddingTop: 64, paddingHorizontal: 20 }, title: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'right' }, empty: { color: '#8994aa', textAlign: 'center', marginTop: 80, fontSize: 15 } });
