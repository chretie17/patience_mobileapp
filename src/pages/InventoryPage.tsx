import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../utils/api';
import { getUserId } from '../utils/storage';

const { width } = Dimensions.get('window');

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
}

interface UsageItem {
  item_id: number;
  item_name: string;
  unit: string;
  quantity_used: number;
  current_stock: number;
}

interface Task {
  id: number;
  title: string;
}

const InventoryUsageReport: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantityInput, setQuantityInput] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [inventoryItems, selectedCategory, searchText]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [itemsResponse, categoriesResponse, tasksResponse] = await Promise.all([
        api.get('/inventory/items'),
        api.get('/inventory/categories'),
        api.get('/tasks'), // Assuming you have a tasks endpoint
      ]);

      setInventoryItems(itemsResponse.data);
      setCategories(['all', ...categoriesResponse.data]);
      setTasks(tasksResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load inventory data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = inventoryItems;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filter out items with zero stock
    filtered = filtered.filter(item => item.current_stock > 0);

    setFilteredItems(filtered);
  };

  const handleAddUsageItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantityInput('');
    setShowItemModal(true);
  };

  const confirmAddUsageItem = () => {
    if (!selectedItem || !quantityInput) {
      Alert.alert('Error', 'Please enter a quantity.');
      return;
    }

    const quantity = parseInt(quantityInput, 10);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }

    if (quantity > selectedItem.current_stock) {
      Alert.alert('Error', `Not enough stock. Available: ${selectedItem.current_stock} ${selectedItem.unit}`);
      return;
    }

    // Check if item already exists in usage list
    const existingIndex = usageItems.findIndex(usage => usage.item_id === selectedItem.id);
    
    if (existingIndex >= 0) {
      const updatedUsageItems = [...usageItems];
      const newQuantity = updatedUsageItems[existingIndex].quantity_used + quantity;
      
      if (newQuantity > selectedItem.current_stock) {
        Alert.alert('Error', `Total quantity exceeds available stock. Available: ${selectedItem.current_stock} ${selectedItem.unit}`);
        return;
      }
      
      updatedUsageItems[existingIndex].quantity_used = newQuantity;
      setUsageItems(updatedUsageItems);
    } else {
      const newUsageItem: UsageItem = {
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        unit: selectedItem.unit,
        quantity_used: quantity,
        current_stock: selectedItem.current_stock,
      };
      setUsageItems([...usageItems, newUsageItem]);
    }

    setShowItemModal(false);
    setSelectedItem(null);
    setQuantityInput('');
  };

  const removeUsageItem = (itemId: number) => {
    setUsageItems(usageItems.filter(item => item.item_id !== itemId));
  };

  const updateUsageQuantity = (itemId: number, newQuantity: number) => {
    const updatedItems = usageItems.map(item => {
      if (item.item_id === itemId) {
        if (newQuantity > item.current_stock) {
          Alert.alert('Error', `Quantity exceeds available stock. Available: ${item.current_stock} ${item.unit}`);
          return item;
        }
        return { ...item, quantity_used: newQuantity };
      }
      return item;
    });
    setUsageItems(updatedItems);
  };

  const submitUsageReport = async () => {
    if (!selectedTask) {
      Alert.alert('Error', 'Please select a task.');
      return;
    }

    if (usageItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item to report usage.');
      return;
    }

    try {
      setSubmitting(true);
      const userId = await getUserId();
      
      const payload = {
        task_id: selectedTask,
        items: usageItems.map(item => ({
          item_id: item.item_id,
          quantity_used: item.quantity_used,
        })),
        used_by: userId,
      };

      await api.post('/inventory/usage', payload);
      
      Alert.alert('Success', 'Usage report submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setUsageItems([]);
            setSelectedTask(null);
            fetchInitialData(); // Refresh inventory to show updated stock
          },
        },
      ]);
    } catch (error) {
      console.error('Error submitting usage report:', error);
      Alert.alert('Error', 'Failed to submit usage report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
      
      <View style={styles.stockInfo}>
        <Text style={styles.stockLabel}>Available Stock</Text>
        <Text style={styles.stockValue}>
          {item.current_stock} {item.unit}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddUsageItem(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+ Add to Report</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUsageItem = ({ item }: { item: UsageItem }) => (
    <View style={styles.usageCard}>
      <View style={styles.usageHeader}>
        <Text style={styles.usageItemName}>{item.item_name}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeUsageItem(item.item_id)}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.quantityContainer}>
        <Text style={styles.quantityLabel}>Quantity Used:</Text>
        <View style={styles.quantityInput}>
          <TextInput
            style={styles.quantityTextInput}
            value={item.quantity_used.toString()}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num) && num > 0) {
                updateUsageQuantity(item.item_id, num);
              }
            }}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={styles.unitText}>{item.unit}</Text>
        </View>
      </View>
      
      <Text style={styles.availableStock}>
        Available: {item.current_stock} {item.unit}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2766EC" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📦 Inventory Usage Report</Text>
          <Text style={styles.headerSubtitle}>Select items and report usage</Text>
        </View>

        {/* Task Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Task</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedTask}
              onValueChange={(value) => setSelectedTask(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select a task..." value={null} />
              {tasks.map((task) => (
                <Picker.Item
                  key={task.id}
                  label={task.title}
                  value={task.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Find Items</Text>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />

          <View style={styles.categoryFilter}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategory === category && styles.categoryButtonTextActive,
                    ]}
                  >
                    {category === 'all' ? 'All Items' : category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Available Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Items ({filteredItems.length})</Text>
          
          <FlatList
            data={filteredItems}
            renderItem={renderInventoryItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No items available</Text>
              </View>
            }
          />
        </View>

        {/* Usage Report */}
        {usageItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage Report ({usageItems.length} items)</Text>
            
            <FlatList
              data={usageItems}
              renderItem={renderUsageItem}
              keyExtractor={(item) => item.item_id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitUsageReport}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>📋 Submit Usage Report</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal
        visible={showItemModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Item to Report</Text>
            
            {selectedItem && (
              <>
                <Text style={styles.modalItemName}>{selectedItem.name}</Text>
                <Text style={styles.modalItemStock}>
                  Available: {selectedItem.current_stock} {selectedItem.unit}
                </Text>
                
                <View style={styles.modalQuantityContainer}>
                  <Text style={styles.modalQuantityLabel}>Quantity Used:</Text>
                  <View style={styles.modalQuantityInput}>
                    <TextInput
                      style={styles.modalQuantityTextInput}
                      value={quantityInput}
                      onChangeText={setQuantityInput}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#999"
                      selectTextOnFocus
                      autoFocus
                    />
                    <Text style={styles.modalUnitText}>{selectedItem.unit}</Text>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowItemModal(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={confirmAddUsageItem}
                  >
                    <Text style={styles.modalConfirmButtonText}>Add Item</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2766EC',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F0FF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F0FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  categoryFilter: {
    marginBottom: 8,
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8F0FF',
  },
  categoryButtonActive: {
    backgroundColor: '#2766EC',
    borderColor: '#2766EC',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 12,
  },
  inventoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8F0FF',
    shadowColor: '#2766EC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#2766EC',
    fontWeight: '500',
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockLabel: {
    fontSize: 14,
    color: '#666',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2766EC',
  },
  addButton: {
    backgroundColor: '#2766EC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  usageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8F0FF',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
  },
  quantityInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E8F0FF',
  },
  quantityTextInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  unitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  availableStock: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width * 0.9,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2766EC',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalItemStock: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalQuantityContainer: {
    marginBottom: 24,
  },
  modalQuantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalQuantityInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8F0FF',
  },
  modalQuantityTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modalUnitText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F0FF',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#2766EC',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InventoryUsageReport;