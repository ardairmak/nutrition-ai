import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { CameraView, Camera } from "expo-camera";

export interface CameraComponentProps {
  onCameraReady: () => void;
  style?: any;
}

export interface CameraComponentHandle {
  takePicture: () => Promise<any | null>;
}

const CameraComponentWithRef = forwardRef<
  CameraComponentHandle,
  CameraComponentProps
>(({ onCameraReady, style }, ref) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<any>(null);

  // Get camera permissions
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === "granted");
      } catch (error) {
        console.error("Camera permission error:", error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Handle camera becoming ready
  const handleCameraReady = () => {
    console.log("Camera is ready");
    setCameraReady(true);
    onCameraReady();
  };

  // Implementation using direct camera access
  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady) {
      console.log("Camera not ready yet");
      return null;
    }

    try {
      console.log("Taking picture with in-app camera");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      console.log("Photo taken:", photo.uri);
      return photo;
    } catch (error) {
      console.error("Error taking picture:", error);
      return null;
    }
  };

  // Expose the takePicture method via ref
  useImperativeHandle(ref, () => ({
    takePicture,
  }));

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.text}>Starting camera...</Text>
      </View>
    );
  }

  // Permission denied state
  if (hasPermission === false) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.mockCamera}>
          <Icon name="camera-off" size={80} color="#555" />
          <Text style={styles.mockCameraText}>Camera Unavailable</Text>
          <Text style={styles.mockCameraSubtext}>
            Camera permission denied. Please enable camera access in your device
            settings.
          </Text>
        </View>
      </View>
    );
  }

  // Integrated camera UI - using actual camera
  return (
    <View style={[styles.container, style]}>
      {/* Real camera component */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={handleCameraReady}
      >
        {/* Camera overlay elements inside the Camera component */}
        <View style={styles.cameraOverlay} pointerEvents="none">
          {/* Frame corners */}
          <View style={styles.frame}>
            {/* Top Left Corner */}
            <View style={styles.cornerTL}>
              <View style={styles.horizontalBar} />
              <View style={styles.verticalBar} />
            </View>

            {/* Top Right Corner */}
            <View style={styles.cornerTR}>
              <View style={[styles.horizontalBar, { right: 0 }]} />
              <View style={[styles.verticalBar, { right: 0 }]} />
            </View>

            {/* Bottom Left Corner */}
            <View style={styles.cornerBL}>
              <View style={[styles.horizontalBar, { bottom: 0 }]} />
              <View style={[styles.verticalBar, { bottom: 0 }]} />
            </View>

            {/* Bottom Right Corner */}
            <View style={styles.cornerBR}>
              <View style={[styles.horizontalBar, { right: 0, bottom: 0 }]} />
              <View style={[styles.verticalBar, { right: 0, bottom: 0 }]} />
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
});

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const frameWidth = screenWidth * 0.5;
const frameHeight = screenHeight * 0.3;
const frameOffset = screenHeight * 0.08;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  text: {
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
  },
  mockCamera: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    position: "relative",
  },
  mockCameraText: {
    color: "#eee",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
  },
  mockCameraSubtext: {
    color: "#bbb",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 40,
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  frame: {
    width: frameWidth,
    height: frameHeight,
    top: -frameOffset,
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 30,
    height: 30,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
  },
  horizontalBar: {
    position: "absolute",
    width: 25,
    height: 4,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  verticalBar: {
    position: "absolute",
    width: 4,
    height: 25,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
});

export default CameraComponentWithRef;
