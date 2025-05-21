import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import api from '../utils/api';
import { saveUserId } from '../utils/storage';

type Props = NativeStackScreenProps<any, 'Login'>;

const LoginPage: React.FC<Props> = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log('Login button pressed');
    console.log('Identifier:', identifier);
    console.log('Password:', password ? '******' : '(empty)');

    setLoading(true);
    try {
      console.log('Sending API request to /users/login');
      const response = await api.post('/users/login', { identifier, password });
      console.log('API response:', response.data);

      const { user } = response.data;
      console.log('User data received:', user);

      console.log('Saving user ID to secure storage:', user.id);
      await saveUserId(user.id);

      navigation.navigate('Home');
    } catch (error) {
      console.error('Login failed:', error.message);
      Alert.alert('Login Failed', 'Invalid username/email or password.');
    } finally {
      console.log('Setting loading state to false');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Username or Email"
              placeholderTextColor="#666"
              value={identifier}
              onChangeText={(text) => {
                console.log('Identifier input changed:', text);
                setIdentifier(text);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                console.log('Password input changed');
                setPassword(text);
              }}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#E05F00',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#E05F00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#E05F00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ffaa7f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#E05F00',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginPage;