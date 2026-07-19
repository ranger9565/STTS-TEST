import React from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';

export interface HistoryItem {
  id: string;
  text: string;
  sourceLabel: string;
}

interface HistoryPanelProps {
  items?: HistoryItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
}

/** پنجره نمایشگر/تاریخچه سمت چپ پنل اصلی */
export function HistoryPanel({ items = [], selectedItemId, onSelectItem }: HistoryPanelProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>نمایشگر / تاریخچه</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => onSelectItem(item.id)}
            style={[styles.item, item.id === selectedItemId && styles.itemSelected]}
          >
            <Text style={styles.itemText}>{item.text}</Text>
            <Text style={styles.itemMeta}>
              #{index + 1} · {item.sourceLabel}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 12, padding: 8 },
  title: { fontSize: 12, marginBottom: 8, textAlign: 'right' },
  item: { borderRadius: 8, padding: 8, marginBottom: 6 },
  itemSelected: { opacity: 0.8 },
  itemText: { fontSize: 13, textAlign: 'right' },
  itemMeta: { fontSize: 11, marginTop: 4, textAlign: 'right' },
});
