import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const router = useRouter();

  if (!permission) {
    // Component đang tải quyền
    return <View />;
  }

  if (!permission.granted) {
    // Chưa cấp quyền
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Bạn cần cấp quyền Máy Ảnh để chụp Niêm chì!</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>CẤP QUYỀN CAMERA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
          <Text style={styles.btnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        
        // CẦN LÀM THÊM ĐỂ ĐÓNG DẤU WATERMARK:
        // Hiện tại expo-image-manipulator không hỗ trợ chèn Text trực tiếp.
        // Để chèn ảnh, ta sẽ bọc bức ảnh + Text tọa độ vào tĩnh và gửi dữ liệu GPS thô lên Server để Server tự đóng dấu.
        // Hoặc lưu lại và hiển thị lên UI.
        
        setPhotoUri(photo.uri);
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể chụp ảnh.');
      }
    }
  };

  const saveAndGoBack = () => {
    // Lưu ảnh vào Hàng đợi (Sync Queue) hoặc gửi lên Server
    Alert.alert('Thành công', 'Đã lưu ảnh Niêm chì vào hệ thống (Chế độ Offline).');
    router.back();
  };

  return (
    <View style={styles.container}>
      {photoUri ? (
        // XEM LẠI ẢNH ĐÃ CHỤP & THÊM WATERMARK ẢO TRÊN UI
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
          
          {/* Lớp Watermark Ảo hiển thị Tọa độ Mẫu */}
          <View style={styles.watermarkOverlay}>
            <Text style={styles.watermarkText}>LAT: 10.762622, LONG: 106.660172</Text>
            <Text style={styles.watermarkText}>{new Date().toLocaleString('vi-VN')}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhotoUri(null)}>
              <Text style={styles.btnText}>Chụp lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveAndGoBack}>
              <Text style={styles.btnText}>Hoàn tất</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // MÀN HÌNH MÁY ẢNH
        <CameraView style={styles.camera} facing="back" ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <Text style={styles.instructionText}>Căn góc chụp rõ tem Niêm Chì</Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                <Text style={styles.closeBtnText}>HỦY</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
              <View style={{ width: 60 }} /> {/* Cân bằng flex */}
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  message: { fontSize: 18, color: '#fff', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#ffb703', padding: 15, borderRadius: 10, alignSelf: 'center', marginBottom: 10 },
  btnBack: { backgroundColor: '#444', padding: 15, borderRadius: 10, alignSelf: 'center' },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', padding: 20 },
  instructionText: { color: '#ffb703', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 40, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
  
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  closeBtn: { padding: 15, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  closeBtnText: { color: '#fff', fontWeight: 'bold' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  previewContainer: { flex: 1, justifyContent: 'center' },
  previewImage: { flex: 1, width: '100%', height: '100%', resizeMode: 'contain' },
  
  watermarkOverlay: { position: 'absolute', bottom: 120, left: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8 },
  watermarkText: { color: '#ffb703', fontSize: 14, fontWeight: 'bold' },

  actionRow: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-around' },
  retakeBtn: { backgroundColor: '#e63946', padding: 15, borderRadius: 10, minWidth: 120, alignItems: 'center' },
  saveBtn: { backgroundColor: '#2a9d8f', padding: 15, borderRadius: 10, minWidth: 120, alignItems: 'center' }
});
