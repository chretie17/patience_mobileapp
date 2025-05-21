import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../utils/api';
import { getUserId } from '../utils/storage';

interface Project {
  id: number;
  project_name: string;
  description: string;
  budget: number;
  images: string[];
  status: string;
  location: string;
  assigned_user: string;
}

const AssignedProjects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<{ [key: number]: string }>({});
  const [previews, setPreviews] = useState<{ [key: number]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const STATUS_OPTIONS = ['planning', 'in_progress', 'completed', 'delayed'];

  const fetchProjects = async () => {
    const userId = await getUserId();
    if (!userId) {
      Alert.alert('Session Expired', 'Please log in again.');
      return;
    }

    try {
      const response = await api.get(`/project/assigned/${userId}`);
      setProjects(response.data);
      const initialStatus = response.data.reduce((acc: any, project: Project) => {
        acc[project.id] = project.status;
        return acc;
      }, {});
      setStatus(initialStatus);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch assigned projects.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchProjects();
  }, []);

  const handleImageSelection = async (type: 'camera' | 'gallery') => {
    if (!selectedProjectId) return;

    let result;
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      setPreviews((prev) => ({
        ...prev,
        [selectedProjectId]: [...(prev[selectedProjectId] || []), imageUri],
      }));
    }
    setModalVisible(false);
  };

  const uploadImages = async (projectId: number) => {
    const imagesToUpload = previews[projectId];
    if (!imagesToUpload || imagesToUpload.length === 0) {
      Alert.alert('Error', 'No images to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('status', status[projectId] || '');
    imagesToUpload.forEach((uri, index) => {
      formData.append('images', {
        uri,
        type: 'image/jpeg',
        name: `project_${projectId}_${index}.jpg`,
      });
    });

    try {
      const response = await api.put(`/project/assigned/${projectId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.message === 'Project updated successfully') {
        Alert.alert('Success', 'Images uploaded successfully.');
        setPreviews((prev) => ({ ...prev, [projectId]: [] }));
        fetchProjects(); // Refresh projects after successful upload
      } else {
        Alert.alert('Error', 'Failed to upload images.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while uploading the images.');
    }
  };

  const handleStatusChange = async (projectId: number) => {
    if (!status[projectId]) {
      Alert.alert('Error', 'Please select a status.');
      return;
    }

    try {
      const response = await api.put(`/project/assigned/${projectId}`, {
        project_id: projectId,
        status: status[projectId],
      });

      if (response.data.message === 'Project updated successfully') {
        Alert.alert('Success', `Project ${projectId} status updated.`);
        fetchProjects(); // Refresh projects after successful status update
      } else {
        Alert.alert('Error', 'Failed to update status.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating the status.');
    }
  };

  const removePreview = (projectId: number, index: number) => {
    setPreviews((prev) => ({
      ...prev,
      [projectId]: prev[projectId].filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#E05F00" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Image</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleImageSelection('camera')}
            >
              <MaterialIcons name="camera-alt" size={32} color="#E05F00" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleImageSelection('gallery')}
            >
              <MaterialIcons name="photo-library" size={32} color="#E05F00" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E05F00']} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.project_name}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.budget}>Budget: RWF {item.budget}</Text>

            <Text style={styles.sectionTitle}>Current Images:</Text>
            {item.images && item.images.length > 0 ? (
              <FlatList
                data={item.images}
                keyExtractor={(img, index) => `${item.id}-${index}`}
                horizontal
                renderItem={({ item: img }) => (
                  <Image source={{ uri: img }} style={styles.projectImage} />
                )}
                contentContainerStyle={styles.imageList}
              />
            ) : (
              <Text style={styles.noImagesText}>No images uploaded yet</Text>
            )}

            {previews[item.id] && previews[item.id].length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>New Images:</Text>
                <FlatList
                  data={previews[item.id]}
                  keyExtractor={(_, index) => `preview-${index}`}
                  horizontal
                  renderItem={({ item: preview, index }) => (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: preview }} style={styles.projectImage} />
                      <TouchableOpacity
                        style={styles.removePreviewButton}
                        onPress={() => removePreview(item.id, index)}
                      >
                        <MaterialIcons name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  contentContainerStyle={styles.imageList}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.addImageButton}
              onPress={() => {
                setSelectedProjectId(item.id);
                setModalVisible(true);
              }}
            >
              <MaterialIcons name="add-a-photo" size={24} color="#fff" />
              <Text style={styles.addImageButtonText}>Add Image</Text>
            </TouchableOpacity>

            {previews[item.id] && previews[item.id].length > 0 && (
              <TouchableOpacity style={styles.uploadButton} onPress={() => uploadImages(item.id)}>
                <MaterialIcons name="cloud-upload" size={24} color="#fff" />
                <Text style={styles.buttonText}>Upload Images</Text>
              </TouchableOpacity>
            )}

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

            <TouchableOpacity style={styles.updateButton} onPress={() => handleStatusChange(item.id)}>
              <MaterialIcons name="update" size={24} color="#fff" />
              <Text style={styles.buttonText}>Update Status</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  budget: {
    fontSize: 16,
    color: '#E05F00',
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  projectImage: {
    width: 120,
    height: 120,
    marginRight: 8,
    borderRadius: 8,
  },
  imageList: {
    marginVertical: 8,
  },
  previewContainer: {
    position: 'relative',
    marginRight: 8,
  },
  removePreviewButton: {
    position: 'absolute',
    top: -8,
    right: 0,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  noImagesText: {
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  addImageButton: {
    backgroundColor: '#E05F00',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  picker: {
    height: 50,
    marginVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  modalCloseButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: '#E05F00',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
export default AssignedProjects;