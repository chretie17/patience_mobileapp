import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import api from '../utils/api';
import { getUserId } from '../utils/storage';

const AttendanceScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<string>('');
  const [checkedIn, setCheckedIn] = useState<boolean>(false);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude}, ${longitude}`);
      },
      error => {
        console.warn('Error getting location', error);
        setLocation('Unavailable');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }, []);

  const handleAttendance = async (type: 'check-in' | 'check-out') => {
    setLoading(true);
    const userId = await getUserId();

    if (!userId) {
      Alert.alert('Session Expired', 'Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const endpoint = `/attendance/${type}`;
      const payload = {
        user_id: userId,
        [`${type}_location`]: location,
      };
      const response = await api.post(endpoint, payload);

      if (response.status === 200) {
        Alert.alert('Success', response.data.message);
        setCheckedIn(type === 'check-in');
      } else {
        Alert.alert('Error', 'Attendance action failed.');
      }
    } catch (error) {
      console.error(`Error on ${type}:`, error);
      Alert.alert('Error', `Could not ${type.replace('-', ' ')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Attendance</Text>
      <Text style={styles.label}>Your Location:</Text>
      <Text style={styles.value}>{location || 'Fetching location...'}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0A74DA" />
      ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#0A74DA' }]}
            onPress={() => handleAttendance('check-in')}
            disabled={checkedIn}
          >
            <Text style={styles.buttonText}>Check In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF3B30' }]}
            onPress={() => handleAttendance('check-out')}
            disabled={!checkedIn}
          >
            <Text style={styles.buttonText}>Check Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 16, marginTop: 10 },
  value: { fontSize: 16, fontWeight: '600', marginBottom: 20 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  button: { padding: 15, borderRadius: 10, minWidth: 120, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },
});

export default AttendanceScreen;
