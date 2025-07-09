import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<any, 'Home'>;

const { width, height } = Dimensions.get('window');

const HomePage: React.FC<Props> = ({ navigation }) => {
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const dashboardItems = [
    {
      icon: 'document-text-outline' as const,
      title: 'View Assigned Tasks',
      subtitle: 'Track your daily tasks',
      screen: 'Tasks',
      colors: ['#1E4FD9', '#4F75FF'],
      iconBg: '#E8F0FF',
      iconColor: '#1E4FD9',
    },
    {
      icon: 'briefcase-outline' as const,
      title: 'View Assigned Projects',
      subtitle: 'Manage project deliverables',
      screen: 'Projects',
      colors: ['#6366F1', '#8B5CF6'],
      iconBg: '#F3F4F6',
      iconColor: '#6366F1',
    },
    {
      icon: 'time-outline' as const,
      title: 'Attendance Taking',
      subtitle: 'Check in and track time',
      screen: 'Attendance',
      colors: ['#10B981', '#059669'],
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
    },
   {
  icon: 'time-outline' as const,
  title: 'Inventory Usage Report',
  subtitle: 'Check in and track time',
  screen: 'Inventory Usage',
  colors: ['#FBBF24', '#F59E0B'],    // amber-400 → amber-500
  iconBg: '#FFFBEB',                // amber-50
  iconColor: '#FBBF24',             // amber-400
},
  ];

  const renderDashboardButton = (item: typeof dashboardItems[0], index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.button, { marginTop: index === 0 ? 0 : 16 }]}
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={item.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        <View style={styles.buttonContent}>
          <View style={[styles.buttonIconContainer, { backgroundColor: item.iconBg }]}>
            <Ionicons
              name={item.icon}
              size={28}
              color={item.iconColor}
            />
          </View>
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>{item.title}</Text>
            <Text style={styles.buttonSubtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color="rgba(255,255,255,0.7)"
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Background */}
      <LinearGradient
        colors={['#1E4FD9', '#4F75FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBackground}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>{getCurrentGreeting()}</Text>
            <Text style={styles.welcomeText}>Welcome to your Dashboard</Text>
          </View>
          <View style={styles.headerIconContainer}>
            <Ionicons name="notifications-outline" size={24} color="white" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Main Actions</Text>
          <View style={styles.buttonContainer}>
            {dashboardItems.map(renderDashboardButton)}
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBackground: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    lineHeight: 32,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  actionsSection: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  buttonContainer: {
    gap: 0,
  },
  button: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    borderRadius: 20,
    padding: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  buttonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default HomePage;