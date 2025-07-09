import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import AssignedTasks from '../pages/AssignedTasks';
import AssignedProjects from '../pages/AssignedProjects';
import AttendanceScreen from '../pages/AttendanceTaking';
import InventoryUsageReport from '../pages/InventoryPage';
const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginPage}
          options={{ title: 'Login', headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomePage}
          options={{ title: 'Home', headerShown: false }}
        />
        <Stack.Screen
          name="Tasks"
          component={AssignedTasks}
          options={{ title: 'Assigned Tasks' }}
        />
        <Stack.Screen
          name="Projects"
          component={AssignedProjects}
          options={{ title: 'Assigned Projects' }}
        />
        <Stack.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{ title: 'Attendance Taking' }}
        />
        <Stack.Screen
          name="Inventory Usage"
          component={InventoryUsageReport}
          options={{ title: 'Inventory Usage Report' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
