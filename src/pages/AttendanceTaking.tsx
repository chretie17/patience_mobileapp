import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import api from '../utils/api';
import { getUserId } from '../utils/storage';

const AttendanceScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationText, setLocationText] = useState<string>('');
  const [checkedIn, setCheckedIn] = useState<boolean>(false);
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'thisWeek' | 'thisMonth'>('all');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationText('Permission denied');
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({});
        console.log('Fetched coordinates:', loc.coords);
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

        const [address] = await Location.reverseGeocodeAsync(loc.coords);
        if (address) {
          const readable = `${address.name || ''}, ${address.street || ''}, ${address.city || ''}, ${address.region || ''}`;
          console.log('Reverse geocoded address:', readable);
          setLocationText(readable);
        } else {
          const fallback = `${loc.coords.latitude}, ${loc.coords.longitude}`;
          console.log('Using fallback coordinates:', fallback);
          setLocationText(fallback);
        }
      } catch (err) {
        console.warn('Error getting location:', err);
        setLocationText('Unavailable');
      }
    })();

    fetchAttendanceRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchQuery, filterType]);

  const fetchAttendanceRecords = async () => {
    const userId = await getUserId();
    if (!userId) return;

    try {
      const response = await api.get(`/attendance/user/${userId}`);
      setRecords(response.data);

      const today = new Date().toISOString().split('T')[0];
      const todayRecord = response.data.find((r: any) => r.date === today);
      if (todayRecord && todayRecord.check_in) {
        setCheckedIn(true);
      }
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];
    
    // Apply date filter
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (filterType === 'thisWeek') {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startOfWeek;
      });
    } else if (filterType === 'thisMonth') {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startOfMonth;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(record => 
        formatDate(record.date).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.check_in && record.check_in.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.check_out && record.check_out.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredRecords(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleAttendance = async (type: 'check-in' | 'check-out') => {
    setLoading(true);
    const userId = await getUserId();

    if (!userId || !location) {
      Alert.alert('Error', 'User ID or Location not available');
      setLoading(false);
      return;
    }

    const locationUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const locationField = type === 'check-in' ? 'check_in_location' : 'check_out_location';

    const payload: any = {
      user_id: userId,
      [locationField]: locationUrl,
    };

    console.log('Submitting', type, 'with payload:', payload);

    try {
      const response = await api.post(`/attendance/${type}`, payload);

      if (response.status === 200) {
        Alert.alert('Success', response.data.message);
        setCheckedIn(type === 'check-in');
        fetchAttendanceRecords();
      } else {
        Alert.alert('Error', response.data.message || 'Attendance action failed.');
      }
    } catch (error: any) {
      console.error(`Error on ${type}:`, error);
      Alert.alert('Error', error.response?.data?.message || `Could not ${type.replace('-', ' ')}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (record: any) => {
    if (record.check_in && record.check_out) return '#4CAF50'; // Green for complete
    if (record.check_in && !record.check_out) return '#FF9800'; // Orange for partial
    return '#F44336'; // Red for incomplete
  };

  const getStatusText = (record: any) => {
    if (record.check_in && record.check_out) return 'Complete';
    if (record.check_in && !record.check_out) return 'Checked In';
    return 'Incomplete';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Attendance</Text>
        <Text style={styles.headerSubtitle}>Track your daily presence</Text>
      </View>

      {/* Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationTitle}>Current Location</Text>
        </View>
        <Text style={styles.locationText}>{locationText || 'Fetching location...'}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.checkInButton,
                checkedIn && styles.disabledButton
              ]}
              onPress={() => handleAttendance('check-in')}
              disabled={checkedIn}
            >
              <Text style={styles.buttonIcon}>🟢</Text>
              <Text style={styles.buttonText}>Check In</Text>
              <Text style={styles.buttonSubtext}>Start your day</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.checkOutButton,
                !checkedIn && styles.disabledButton
              ]}
              onPress={() => handleAttendance('check-out')}
              disabled={!checkedIn}
            >
              <Text style={styles.buttonIcon}>🔴</Text>
              <Text style={styles.buttonText}>Check Out</Text>
              <Text style={styles.buttonSubtext}>End your day</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Records Section */}
      <View style={styles.recordsSection}>
        <Text style={styles.recordsTitle}>Attendance History</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {['all', 'thisWeek', 'thisMonth'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                filterType === filter && styles.activeFilter
              ]}
              onPress={() => setFilterType(filter as any)}
            >
              <Text style={[
                styles.filterText,
                filterType === filter && styles.activeFilterText
              ]}>
                {filter === 'all' ? 'All' : filter === 'thisWeek' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Records List */}
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'Your attendance records will appear here'}
            </Text>
          </View>
        ) : (
          filteredRecords.map((record, index) => (
            <View key={index} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.recordDateContainer}>
                  <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record) }]}>
                    <Text style={styles.statusText}>{getStatusText(record)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.recordContent}>
                <View style={styles.timeRow}>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeLabel}>Check In</Text>
                    <Text style={styles.timeValue}>{formatTime(record.check_in)}</Text>
                  </View>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeLabel}>Check Out</Text>
                    <Text style={styles.timeValue}>{formatTime(record.check_out)}</Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={() => record.check_in_location && Linking.openURL(record.check_in_location)}
                    disabled={!record.check_in_location}
                  >
                    <Text style={styles.locationButtonIcon}>📍</Text>
                    <Text style={styles.locationButtonText}>
                      {record.check_in_location ? 'Check In Location' : 'No Location'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={() => record.check_out_location && Linking.openURL(record.check_out_location)}
                    disabled={!record.check_out_location}
                  >
                    <Text style={styles.locationButtonIcon}>📍</Text>
                    <Text style={styles.locationButtonText}>
                      {record.check_out_location ? 'Check Out Location' : 'No Location'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSection: {
    backgroundColor: '#6366F1',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  locationCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  checkInButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  checkOutButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  recordsSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  recordsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilter: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  recordHeader: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  recordDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  recordContent: {
    padding: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  locationButtonIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  locationButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default AttendanceScreen;