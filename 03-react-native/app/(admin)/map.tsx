import React from 'react';
import { View, StyleSheet } from 'react-native';
import AdminLiveMap from '../../components/AdminLiveMap';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <AdminLiveMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
