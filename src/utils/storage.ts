import * as SecureStore from 'expo-secure-store';

export const saveUserId = async (userId: number): Promise<void> => {
  try {
    await SecureStore.setItemAsync('userId', userId.toString()); // Ensure the value is a string
    console.log('User ID saved successfully:', userId);
  } catch (error) {
    console.error('Error saving user ID:', error);
    throw error;
  }
};

export const getUserId = async (): Promise<string | null> => {
  try {
    const userId = await SecureStore.getItemAsync('userId');
    console.log('Retrieved user ID from storage:', userId);
    return userId;
  } catch (error) {
    console.error('Error retrieving user ID:', error);
    return null;
  }
};

export const clearUserId = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('userId');
    console.log('User ID cleared from storage');
  } catch (error) {
    console.error('Error clearing user ID:', error);
    throw error;
  }
};
