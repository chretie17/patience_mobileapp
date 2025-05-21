import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<any, 'Home'>;

const { width } = Dimensions.get('window');

const HomePage: React.FC<Props> = ({ navigation }) => {
  const renderDashboardButton = (
    icon: React.ComponentProps<typeof Ionicons>['name'], 
    title: string, 
    screen: string
  ) => (
    <TouchableOpacity 
      style={styles.button}
      onPress={() => navigation.navigate(screen)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#FF6B6B', '#FF8E53']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        <View style={styles.buttonContent}>
          <Ionicons 
            name={icon} 
            size={24} 
            color="white" 
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>{title}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Manage Your Work</Text>
      </View>

      <View style={styles.buttonContainer}>
        {renderDashboardButton('document-text-outline', 'View Assigned Tasks', 'Tasks')}
        {renderDashboardButton('briefcase-outline', 'View Assigned Projects', 'Projects')}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  buttonGradient: {
    borderRadius: 16,
    padding: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default HomePage;