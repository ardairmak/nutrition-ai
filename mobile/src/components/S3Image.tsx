import React, { useState, useEffect } from "react";
import { Image, ImageProps, ActivityIndicator, View } from "react-native";
import { uploadService } from "../services/uploadService";

interface S3ImageProps extends Omit<ImageProps, "source"> {
  imageUrl: string;
  fallbackSource?: ImageProps["source"];
  showLoader?: boolean;
}

export const S3Image: React.FC<S3ImageProps> = ({
  imageUrl,
  fallbackSource,
  showLoader = true,
  style,
  ...props
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const getSignedUrl = async () => {
      if (!imageUrl) {
        setLoading(false);
        setError(true);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        const url = await uploadService.getSignedUrl(imageUrl);
        setSignedUrl(url);
      } catch (err) {
        console.error("Error getting signed URL:", err);
        setError(true);
        setSignedUrl(imageUrl); // Fallback to original URL
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [imageUrl]);

  if (loading && showLoader) {
    return (
      <View style={[style, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="small" color="#4285F4" />
      </View>
    );
  }

  if (error && fallbackSource) {
    return <Image source={fallbackSource} style={style} {...props} />;
  }

  if (!signedUrl) {
    return null;
  }

  return (
    <Image
      source={{ uri: signedUrl }}
      style={style}
      onError={() => setError(true)}
      {...props}
    />
  );
};
