import { Storage } from '@google-cloud/storage';

// Google Cloud Storage 클라이언트 초기화
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GCP_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
  },
});

const bucketName = process.env.GCS_BUCKET_NAME || 'education-platform';
const bucket = storage.bucket(bucketName);

/**
 * 파일을 Google Cloud Storage에 업로드
 */
export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath?: string
): Promise<{ fileId: string; webViewLink: string; webContentLink: string }> {
  try {
    // 파일 경로 생성: folderPath/fileName
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    const file = bucket.file(filePath);

    // 파일 업로드
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
      },
      public: false, // 공개하지 않음 (Signed URL 사용)
    });

    // Signed URL 생성 (7일간 유효)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7일
    });

    // 공개 URL (bucket이 public인 경우)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

    return {
      fileId: filePath, // GCS에서는 경로가 ID 역할
      webViewLink: signedUrl, // 임시 접근 URL
      webContentLink: signedUrl, // 다운로드 URL
    };
  } catch (error) {
    console.error('Google Cloud Storage upload error:', error);
    throw new Error('파일 업로드 실패');
  }
}

/**
 * 파일 삭제
 */
export async function deleteFromGoogleDrive(filePath: string): Promise<void> {
  try {
    const file = bucket.file(filePath);
    await file.delete();
  } catch (error) {
    console.error('Google Cloud Storage delete error:', error);
    throw new Error('파일 삭제 실패');
  }
}

/**
 * 파일 정보 조회
 */
export async function getGoogleDriveFileInfo(filePath: string) {
  try {
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();

    return {
      id: filePath,
      name: metadata.name,
      mimeType: metadata.contentType,
      size: metadata.size,
      createdTime: metadata.timeCreated,
    };
  } catch (error) {
    console.error('Google Cloud Storage get file error:', error);
    throw new Error('파일 정보 조회 실패');
  }
}

/**
 * Signed URL 갱신 (만료된 URL을 새로 생성)
 */
export async function refreshSignedUrl(filePath: string): Promise<string> {
  try {
    const file = bucket.file(filePath);
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7일
    });
    return signedUrl;
  } catch (error) {
    console.error('Signed URL refresh error:', error);
    throw new Error('URL 갱신 실패');
  }
}
