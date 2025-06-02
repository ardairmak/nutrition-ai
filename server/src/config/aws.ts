import AWS from "aws-sdk";

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

// Create S3 instance
export const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  signatureVersion: "v4",
});

// S3 bucket configuration
export const S3_CONFIG = {
  BUCKET_NAME: process.env.S3_BUCKET_NAME || "your-app-name-images-2024",
  REGION: process.env.AWS_REGION || "us-east-1",
  FOLDERS: {
    MEALS: "meals/",
    PROFILES: "profiles/",
  },
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
};

// Generate signed URL for secure access
export const generateSignedUrl = (
  key: string,
  expires: number = 3600
): string => {
  return s3.getSignedUrl("getObject", {
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key,
    Expires: expires, // URL expires in 1 hour by default
  });
};

// Upload file to S3
export const uploadToS3 = async (
  file: Buffer,
  key: string,
  contentType: string
): Promise<AWS.S3.ManagedUpload.SendData> => {
  const params: AWS.S3.PutObjectRequest = {
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    ServerSideEncryption: "AES256",
  };

  return s3.upload(params).promise();
};

// Delete file from S3
export const deleteFromS3 = async (key: string): Promise<void> => {
  const params: AWS.S3.DeleteObjectRequest = {
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key,
  };

  await s3.deleteObject(params).promise();
};
