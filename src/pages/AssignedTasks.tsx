import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../utils/api';
import { getUserId } from '../utils/storage';
import * as Location from 'expo-location'; // Location package

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_by: string;
  start_date: string;
  end_date: string;
}

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed', 'Delayed'];

const AssignedTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const userId = await getUserId();
    if (!userId) {
      Alert.alert('Session Expired', 'Please log in again.');
      return;
    }

    try {
      const response = await api.get(`/tasks/assigned/${userId}`);
      setTasks(response.data);
      const initialStatus = response.data.reduce((acc: any, task: Task) => {
        acc[task.id] = task.status;
        return acc;
      }, {});
      setStatus(initialStatus);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch assigned tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId: number) => {
    let location = null;
    try {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to update status.');
        return;
      }

      const coords = await Location.getCurrentPositionAsync({});
      location = `https://maps.google.com/?q=${coords.coords.latitude},${coords.coords.longitude}`;
    } catch (locError) {
      console.error('Location error:', locError);
      Alert.alert('Error', 'Unable to get your location.');
      return;
    }

    try {
      const response = await api.put(`/tasks/${taskId}/status`, {
        status: status[taskId],
        location: location,
      });

      if (response.data.message === 'Task status updated successfully') {
        Alert.alert('Success', `Task ${taskId} status updated.`);
        fetchTasks();
      } else {
        Alert.alert('Error', 'Failed to update task status.');
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred while updating the task status.');
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#E05F00" style={styles.loader} />;
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Priority:</Text>
            <Text style={styles.value}>{item.priority}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Assigned By:</Text>
            <Text style={styles.value}>{item.assigned_by}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Start Date:</Text>
            <Text style={styles.value}>{item.start_date}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>End Date:</Text>
            <Text style={styles.value}>{item.end_date}</Text>
          </View>

          <Text style={styles.status}>Status: {status[item.id]}</Text>

          <Picker
            selectedValue={status[item.id]}
            onValueChange={(value) =>
              setStatus((prev) => ({
                ...prev,
                [item.id]: value,
              }))
            }
            style={styles.picker}
          >
            {STATUS_OPTIONS.map((option) => (
              <Picker.Item key={option} label={option} value={option} />
            ))}
          </Picker>

          <TouchableOpacity style={styles.button} onPress={() => handleStatusUpdate(item.id)}>
            <Text style={styles.buttonText}>Update Status</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 16, margin: 8, borderRadius: 8, elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  description: { fontSize: 14, color: '#555', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  value: { fontSize: 14, color: '#555' },
  status: { marginTop: 8, fontSize: 14, fontWeight: 'bold', color: '#E05F00' },
  picker: { height: 50, marginVertical: 10 },
  button: { backgroundColor: '#E05F00', padding: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default AssignedTasks;
