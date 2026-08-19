import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    if (!email || !password) return Alert.alert('ديوان', 'أدخل البريد وكلمة المرور.');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return Alert.alert('تعذر تسجيل الدخول', error.message);
    router.replace('/');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تسجيل الدخول</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني" placeholderTextColor="#7d879b" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
      <TextInput value={password} onChangeText={setPassword} placeholder="كلمة المرور" placeholderTextColor="#7d879b" secureTextEntry style={styles.input} />
      <Pressable onPress={signIn} disabled={loading} style={styles.button}>
        <Text style={styles.buttonText}>{loading ? 'جارٍ الدخول...' : 'دخول'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0b1020' },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 24, textAlign: 'right' },
  input: { height: 54, borderRadius: 14, backgroundColor: '#171e31', color: '#fff', paddingHorizontal: 16, marginBottom: 12, textAlign: 'right' },
  button: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginTop: 8 },
  buttonText: { color: '#111827', fontSize: 17, fontWeight: '800' },
});
