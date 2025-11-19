import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { UploadedFile } from '../types';

interface FileUploadProps {
  onFileSelect: (file: UploadedFile, allFiles?: UploadedFile[]) => void;
}

// 웹 환경 체크
const isWeb = Platform.OS === 'web';

// 디버깅: Platform 정보 로그
console.log('FileUpload component loaded');
console.log('Platform.OS:', Platform.OS);
console.log('isWeb:', isWeb);

// 이미지를 리사이즈하고 압축
const resizeAndCompressImage = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new (window as any).Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // 더 작은 크기로 압축 (800px)
      const MAX_SIZE = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      // 품질을 낮춰서 더 강하게 압축 (0.6)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              const sizeInMB = (base64.length * 0.75) / (1024 * 1024);
              console.log(`압축 후 크기: ${sizeInMB.toFixed(2)}MB`);

              // 4MB 초과 시 에러
              if (sizeInMB > 4) {
                URL.revokeObjectURL(url);
                reject(new Error('파일이 너무 큽니다. 더 작은 이미지를 사용해주세요.'));
                return;
              }

              URL.revokeObjectURL(url);
              resolve(base64);
            };
            reader.onerror = reject;
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        },
        'image/jpeg',
        0.6
      );
    };

    img.onerror = reject;
    img.src = url;
  });
};

// PDF를 base64로 변환
const fileToBase64Web = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickImageWeb = () => {
    console.log('pickImageWeb called');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // 여러 파일 선택 가능
    console.log('Input element created, about to click');
    input.onchange = async (e: any) => {
      console.log('File input changed, files:', e.target.files);
      const files = Array.from(e.target.files || []) as File[];

      if (files.length === 0) return;

      setIsProcessing(true);
      try {
        const uploadedFiles: UploadedFile[] = [];

        // 모든 이미지를 압축
        let totalSize = 0;
        for (const file of files) {
          try {
            const base64 = await resizeAndCompressImage(file);
            const sizeInMB = (base64.length * 0.75) / (1024 * 1024);
            totalSize += sizeInMB;

            console.log(`${file.name}: ${sizeInMB.toFixed(2)}MB`);

            uploadedFiles.push({
              uri: URL.createObjectURL(file),
              name: file.name,
              type: 'image',
              mimeType: 'image/jpeg',
              base64: base64,
            });
          } catch (error: any) {
            console.error(`Error processing ${file.name}:`, error);
            alert(`${file.name}: ${error.message}`);
          }
        }

        console.log(`총 크기: ${totalSize.toFixed(2)}MB`);

        if (totalSize > 4) {
          alert(`압축 후 총 크기가 ${totalSize.toFixed(2)}MB입니다.\n이미지를 더 적게 선택하거나 해상도가 낮은 이미지를 사용해주세요.`);
          return;
        }

        if (uploadedFiles.length > 0) {
          setSelectedFile(uploadedFiles[0]);
          setSelectedFiles(uploadedFiles);
          onFileSelect(uploadedFiles[0], uploadedFiles);
          console.log(`총 ${uploadedFiles.length}개 이미지 업로드 완료`);
        }
      } finally {
        setIsProcessing(false);
      }
    };
    input.click();
  };

  const pickDocumentWeb = () => {
    console.log('pickDocumentWeb called');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    console.log('Input element created, about to click');
    input.onchange = async (e: any) => {
      console.log('File input changed, files:', e.target.files);
      const file = e.target.files?.[0];
      if (file) {
        // PDF 용량 제한 20MB로 증가
        const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
        if (file.size > MAX_PDF_SIZE) {
          const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
          alert(`PDF 파일이 너무 큽니다 (${sizeInMB}MB).\n20MB 이하의 파일을 사용해주세요.`);
          return;
        }

        setIsProcessing(true);
        try {
          const isPdf = file.type === 'application/pdf';
          const base64 = isPdf 
            ? await fileToBase64Web(file)
            : await resizeAndCompressImage(file);
          
          const uploadedFile: UploadedFile = {
            uri: URL.createObjectURL(file),
            name: file.name,
            type: isPdf ? 'pdf' : 'image',
            mimeType: isPdf ? file.type : 'image/jpeg',
            base64: base64,
          };
          setSelectedFile(uploadedFile);
          onFileSelect(uploadedFile);
        } catch (error) {
          console.error('Document processing error:', error);
          alert('파일을 처리할 수 없습니다.');
        } finally {
          setIsProcessing(false);
        }
      }
    };
    input.click();
  };

  const pickImage = async () => {
    console.log('pickImage called, isWeb:', isWeb);

    if (isWeb) {
      pickImageWeb();
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert('사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const file: UploadedFile = {
        uri: asset.uri,
        name: asset.uri.split('/').pop() || 'portfolio.jpg',
        type: 'image',
        mimeType: asset.mimeType || 'image/jpeg',
        base64: asset.base64 || undefined,
      };
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const pickDocument = async () => {
    console.log('pickDocument called, isWeb:', isWeb);
    
    if (isWeb) {
      pickDocumentWeb();
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isPdf = asset.mimeType === 'application/pdf';
      const file: UploadedFile = {
        uri: asset.uri,
        name: asset.name,
        type: isPdf ? 'pdf' : 'image',
        mimeType: asset.mimeType || 'application/pdf',
      };
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>포트폴리오 업로드</Text>
        <Text style={styles.subtitle}>이미지 또는 PDF 파일을 업로드해주세요</Text>
        <Text style={styles.sizeLimit}>• 이미지: 여러 개 선택 가능 (자동 최적화)</Text>
        <Text style={styles.sizeLimit}>• PDF: 최대 20MB</Text>
        <Text style={styles.sizeTip}>💡 대용량 PDF도 업로드 가능! 처리 시간이 조금 걸릴 수 있어요</Text>
      </View>

      <View style={styles.uploadArea}>
        {!selectedFile ? (
          <>
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconText}>📎</Text>
            </View>
            <Text style={styles.uploadText}>
              {isProcessing ? '파일 처리 중...' : '파일을 선택해주세요 (여러 개 가능)'}
            </Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.uploadButton, isProcessing && styles.uploadButtonDisabled]} 
                onPress={pickImage}
                disabled={isProcessing}
              >
                <Text style={styles.uploadButtonText}>📷 이미지</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.uploadButton, isProcessing && styles.uploadButtonDisabled]} 
                onPress={pickDocument}
                disabled={isProcessing}
              >
                <Text style={styles.uploadButtonText}>📄 PDF</Text>
              </TouchableOpacity>
            </View>
            {isProcessing && (
              <Text style={styles.processingText}>이미지를 최적화하는 중...</Text>
            )}
          </>
        ) : (
          <View style={styles.previewContainer}>
            {selectedFiles.length > 1 ? (
              <>
                <View style={styles.multiFileInfo}>
                  <Text style={styles.multiFileCount}>
                    📁 {selectedFiles.length}개 이미지 선택됨
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.thumbnailScroll}
                    contentContainerStyle={styles.thumbnailContainer}
                  >
                    {selectedFiles.map((file, index) => (
                      <Image
                        key={index}
                        source={{ uri: file.uri }}
                        style={styles.thumbnail}
                      />
                    ))}
                  </ScrollView>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={pickImage}
                >
                  <Text style={styles.changeButtonText}>파일 변경</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {selectedFile.type === 'image' && selectedFile.uri && (
                  <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
                )}
                {selectedFile.type === 'pdf' && (
                  <View style={styles.pdfIcon}>
                    <Text style={styles.pdfIconText}>📄</Text>
                  </View>
                )}
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.fileType}>
                    {selectedFile.type === 'pdf' ? 'PDF 문서' : '이미지 파일 (최적화됨)'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={selectedFile.type === 'pdf' ? pickDocument : pickImage}
                >
                  <Text style={styles.changeButtonText}>파일 변경</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 4,
  },
  sizeLimit: {
    fontSize: 13,
    color: '#999999',
    lineHeight: 20,
  },
  sizeTip: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: '#F8F8F8',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    lineHeight: 18,
  },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
    minHeight: 300,
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 40,
  },
  uploadText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  processingText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 16,
    fontWeight: '500',
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  pdfIcon: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIconText: {
    fontSize: 60,
  },
  fileInfo: {
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    maxWidth: '90%',
  },
  fileType: {
    fontSize: 14,
    color: '#999999',
  },
  changeButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  multiFileInfo: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  multiFileCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  thumbnailScroll: {
    width: '100%',
  },
  thumbnailContainer: {
    gap: 12,
    paddingHorizontal: 4,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
});
