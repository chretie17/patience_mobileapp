import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../utils/api';
import { getUserId } from '../utils/storage';
import * as Location from 'expo-location';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_by: string;
  start_date: string;
  end_date: string;
  feedback?: string;
}

const STATUS_OPTIONS = [
  { label: '⏳ Pending', value: 'Pending', color: '#FF9500' },
  { label: '🔄 In Progress', value: 'In Progress', color: '#2766EC' },
  { label: '✅ Completed', value: 'Completed', color: '#34C759' },
  { label: '⚠️ Delayed', value: 'Delayed', color: '#FF3B30' },
];

const PRIORITY_COLORS = {
  High: '#FF3B30',
  Medium: '#FF9500',
  Low: '#34C759',
};

const { width } = Dimensions.get('window');

const AssignedTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming'>('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [tasks, filter]);

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

  const applyFilter = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let filtered = [...tasks];

    switch (filter) {
      case 'today':
        filtered = tasks.filter(task => {
          const startDate = new Date(task.start_date);
          const endDate = new Date(task.end_date);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          
          return (startDate <= today && endDate >= today) || 
                 (startDate.getTime() === today.getTime()) ||
                 (endDate.getTime() === today.getTime());
        });
        break;
      case 'overdue':
        filtered = tasks.filter(task => {
          const endDate = new Date(task.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate < today && task.status !== 'Completed';
        });
        break;
      case 'upcoming':
        filtered = tasks.filter(task => {
          const startDate = new Date(task.start_date);
          startDate.setHours(0, 0, 0, 0);
          return startDate > today;
        });
        break;
      default:
        filtered = tasks;
    }

    setFilteredTasks(filtered);
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

  const getStatusColor = (taskStatus: string) => {
    const statusObj = STATUS_OPTIONS.find(opt => opt.value === taskStatus);
    return statusObj?.color || '#2766EC';
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || '#666';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    const formattedDate = date.toLocaleDateString('en-US', dateOptions);
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions);
    
    return `${formattedDate} at ${formattedTime}`;
  };

  const getTaskCountByFilter = (filterType: 'all' | 'today' | 'overdue' | 'upcoming') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filterType) {
      case 'today':
        return tasks.filter(task => {
          const startDate = new Date(task.start_date);
          const endDate = new Date(task.end_date);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          
          return (startDate <= today && endDate >= today) || 
                 (startDate.getTime() === today.getTime()) ||
                 (endDate.getTime() === today.getTime());
        }).length;
      case 'overdue':
        return tasks.filter(task => {
          const endDate = new Date(task.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate < today && task.status !== 'Completed';
        }).length;
      case 'upcoming':
        return tasks.filter(task => {
          const startDate = new Date(task.start_date);
          startDate.setHours(0, 0, 0, 0);
          return startDate > today;
        }).length;
      default:
        return tasks.length;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2766EC" />
        <Text style={styles.loadingText}>Loading your tasks...</Text>
      </View>
    );
  }

  if (filteredTasks.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {[
            { key: 'all', label: 'All', icon: '📋' },
            { key: 'today', label: 'Today', icon: '📅' },
            { key: 'overdue', label: 'Overdue', icon: '⚠️' },
            { key: 'upcoming', label: 'Upcoming', icon: '🔮' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                filter === tab.key && styles.filterTabActive
              ]}
              onPress={() => setFilter(tab.key as any)}
            >
              <Text style={styles.filterIcon}>{tab.icon}</Text>
              <Text style={[
                styles.filterText,
                filter === tab.key && styles.filterTextActive
              ]}>
                {tab.label}
              </Text>
              <View style={[
                styles.filterBadge,
                filter === tab.key && styles.filterBadgeActive
              ]}>
                <Text style={[
                  styles.filterBadgeText,
                  filter === tab.key && styles.filterBadgeTextActive
                ]}>
                  {getTaskCountByFilter(tab.key as any)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            {filter === 'today' ? '📅' : filter === 'overdue' ? '⚠️' : filter === 'upcoming' ? '🔮' : '📋'}
          </Text>
          <Text style={styles.emptyTitle}>
            {filter === 'today' ? 'No Tasks for Today' : 
             filter === 'overdue' ? 'No Overdue Tasks' :
             filter === 'upcoming' ? 'No Upcoming Tasks' : 'No Tasks Assigned'}
          </Text>
          <Text style={styles.emptyText}>
            {filter === 'today' ? 'You\'re all caught up for today! 🎉' : 
             filter === 'overdue' ? 'Great job staying on track!' :
             filter === 'upcoming' ? 'No upcoming tasks scheduled.' : 'You don\'t have any assigned tasks at the moment.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All', icon: '📋' },
          { key: 'today', label: 'Today', icon: '📅' },
          { key: 'overdue', label: 'Overdue', icon: '⚠️' },
          { key: 'upcoming', label: 'Upcoming', icon: '🔮' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              filter === tab.key && styles.filterTabActive
            ]}
            onPress={() => setFilter(tab.key as any)}
          >
            <Text style={styles.filterIcon}>{tab.icon}</Text>
            <Text style={[
              styles.filterText,
              filter === tab.key && styles.filterTextActive
            ]}>
              {tab.label}
            </Text>
            <View style={[
              styles.filterBadge,
              filter === tab.key && styles.filterBadgeActive
            ]}>
              <Text style={[
                styles.filterBadgeText,
                filter === tab.key && styles.filterBadgeTextActive
              ]}>
                {getTaskCountByFilter(tab.key as any)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Header with Priority Badge */}
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                  <Text style={styles.priorityText}>{item.priority}</Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.description} numberOfLines={3}>{item.description}</Text>

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>👤 Assigned By</Text>
                <Text style={styles.detailValue}>{item.created_by}</Text>
              </View>
               <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{item.description}</Text>
              </View>
               <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Feedback</Text>
                <Text style={styles.detailValue}>{item.feedback}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>📅 Start Date</Text>
                <Text style={styles.detailValue}>{formatDateTime(item.start_date)}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>🏁 End Date</Text>
                <Text style={styles.detailValue}>{formatDateTime(item.end_date)}</Text>
              </View>
            </View>

            {/* Current Status */}
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Current Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status[item.id]) }]}>
                <Text style={styles.statusText}>
                  {STATUS_OPTIONS.find(opt => opt.value === status[item.id])?.label || status[item.id]}
                </Text>
              </View>
            </View>

            {/* Status Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Update Status</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={status[item.id]}
                  onValueChange={(value) =>
                    setStatus((prev) => ({
                      ...prev,
                      [item.id]: value,
                    }))
                  }
                  style={Platform.OS === 'ios' ? styles.pickerIOS : styles.pickerAndroid}
                  itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : undefined}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <Picker.Item 
                      key={option.value} 
                      label={option.label} 
                      value={option.value}
                      color={Platform.OS === 'android' ? '#333' : undefined}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Update Button */}
            <TouchableOpacity 
              style={styles.updateButton} 
              onPress={() => handleStatusUpdate(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.updateButtonText}>📍 Update Status & Location</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F0FF',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E8F0FF',
  },
  filterTabActive: {
    backgroundColor: '#2766EC',
    borderColor: '#2766EC',
  },
  filterIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2766EC',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#2766EC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E8F0FF',
  },
  cardHeader: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 26,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  detailItem: {
    backgroundColor: '#F8FAFF',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2766EC',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: width * 0.4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8F0FF',
    overflow: 'hidden',
  },
  pickerIOS: {
    height: 120,
    backgroundColor: 'transparent',
  },
  pickerAndroid: {
    height: 50,
    backgroundColor: 'transparent',
    color: '#333',
  },
  pickerItemIOS: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: '#2766EC',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2766EC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AssignedTasks;