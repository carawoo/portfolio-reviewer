import React, { useState, useEffect } from 'react';
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

// PDF.js 타입 선언
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

// PDF.js CDN에서 로드
const loadPdfJs = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser environment'));
      return;
    }

    // 이미 로드되어 있으면 바로 resolve
    if (window.pdfjsLib) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        // Worker 설정
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('PDF.js loaded successfully');
        resolve();
      } else {
        reject(new Error('PDF.js failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js script'));
    document.head.appendChild(script);
  });
};

// 이미지를 리사이즈하고 압축
const resizeAndCompressImage = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new (window as any).Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // 극도로 작은 크기로 압축 (400px) - Vercel 4.5MB 제한 회피
      const MAX_SIZE = 400;
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

      // 품질을 극도로 낮춰서 압축 (0.4)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              const sizeInMB = (base64.length * 0.75) / (1024 * 1024);
              console.log(`압축 후 크기: ${sizeInMB.toFixed(2)}MB`);

              // 2.5MB 초과 시 에러 (매우 안전한 제한)
              if (sizeInMB > 2.5) {
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
        0.4
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

// PDF를 이미지 배열로 변환 (대용량 PDF 자동 압축)
const convertPdfToImages = async (
  file: Blob,
  onProgress?: (current: number, total: number) => void
): Promise<UploadedFile[]> => {
  try {
    // PDF.js 로드
    await loadPdfJs();

    if (!window.pdfjsLib) {
      throw new Error('PDF.js 라이브러리를 로드할 수 없습니다.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const uploadedFiles: UploadedFile[] = [];

    // 최대 15페이지로 제한 (Vercel 4.5MB body limit 회피)
    const MAX_PAGES = 15;
    const pagesToProcess = Math.min(numPages, MAX_PAGES);

    console.log(`PDF 총 페이지: ${numPages}${numPages > MAX_PAGES ? ` (${MAX_PAGES}페이지만 처리)` : ''}`);

    // 각 페이지를 이미지로 변환
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      onProgress?.(pageNum, pagesToProcess);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 }); // 낮은 해상도 (413 에러 방지)

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context!,
        viewport: viewport,
      }).promise;

      // Canvas를 Blob으로 변환 (품질 낮춤)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          },
          'image/jpeg',
          0.6
        );
      });

      // 이미지 압축
      const base64 = await resizeAndCompressImage(blob);

      uploadedFiles.push({
        uri: canvas.toDataURL('image/jpeg', 0.6),
        name: `page-${pageNum}.jpg`,
        type: 'image',
        mimeType: 'image/jpeg',
        base64: base64,
      });
    }

    console.log(`PDF → ${uploadedFiles.length}개 이미지로 변환 완료`);
    return uploadedFiles;
  } catch (error) {
    console.error('PDF 변환 오류:', error);
    throw new Error('PDF를 이미지로 변환할 수 없습니다.');
  }
};

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [conversionProgress, setConversionProgress] = useState<{ current: number; total: number } | null>(null);

  // PDF.js 미리 로드 (웹 환경에서만)
  useEffect(() => {
    if (isWeb) {
      loadPdfJs().catch((error) => {
        console.warn('PDF.js 사전 로드 실패 (필요할 때 다시 시도됩니다):', error);
      });
    }
  }, []);

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

      // 최대 6개 이미지로 제한
      if (files.length > 6) {
        alert(`이미지는 최대 6개까지만 업로드 가능합니다.\n현재 선택: ${files.length}개`);
        return;
      }

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

        if (totalSize > 2.5) {
          alert(`압축 후 총 크기가 ${totalSize.toFixed(2)}MB입니다.\n이미지를 더 적게 선택하거나 해상도가 낮은 이미지를 사용해주세요.\n(최대 2.5MB까지 업로드 가능)`);
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
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
        const isPdf = file.type === 'application/pdf';

        // PDF 용량 제한: 15MB 초과 시 자동 이미지 변환 제안
        const MAX_PDF_SIZE = 15 * 1024 * 1024; // 15MB
        if (isPdf && file.size > MAX_PDF_SIZE) {
          const autoConvert = window.confirm(
            `PDF 파일이 ${sizeInMB}MB로 용량 제한(15MB)을 초과합니다.\n\n` +
            `✨ 자동으로 이미지로 변환하여 압축할까요?\n\n` +
            `• PDF의 처음 15페이지를 이미지로 변환합니다\n` +
            `• 자동으로 최적화하여 업로드합니다\n` +
            `• 60MB 이상 대용량 PDF도 처리 가능합니다\n\n` +
            `변환 시간: 약 1-2분 소요 예상`
          );

          if (!autoConvert) {
            alert(
              `PDF 압축 사이트를 이용해주세요:\n` +
              `• ilovepdf.com\n` +
              `• smallpdf.com`
            );
            return;
          }

          // PDF를 이미지로 자동 변환
          setIsProcessing(true);
          setProcessingMessage('PDF를 이미지로 변환 중...');
          setConversionProgress({ current: 0, total: 0 });

          try {
            const uploadedFiles = await convertPdfToImages(file, (current, total) => {
              setConversionProgress({ current, total });
              setProcessingMessage(`페이지 변환 중: ${current}/${total}`);
            });

            // 변환 완료 후 총 크기 확인
            const totalSize = uploadedFiles.reduce((sum, f) => {
              return sum + (f.base64 ? (f.base64.length * 0.75) / (1024 * 1024) : 0);
            }, 0);

            console.log(`총 변환 크기: ${totalSize.toFixed(2)}MB`);

            if (totalSize > 2.5) {
              alert(
                `변환 후 총 크기가 ${totalSize.toFixed(2)}MB입니다.\n\n` +
                `최대 크기 2.5MB를 초과하여 일부 페이지만 업로드합니다.`
              );
              // 2.5MB 이하가 될 때까지 페이지 제거
              let currentSize = 0;
              const limitedFiles: UploadedFile[] = [];
              for (const file of uploadedFiles) {
                const fileSize = file.base64 ? (file.base64.length * 0.75) / (1024 * 1024) : 0;
                if (currentSize + fileSize <= 2.5) {
                  limitedFiles.push(file);
                  currentSize += fileSize;
                } else {
                  break;
                }
              }
              setSelectedFile(limitedFiles[0]);
              setSelectedFiles(limitedFiles);
              onFileSelect(limitedFiles[0], limitedFiles);
            } else {
              setSelectedFile(uploadedFiles[0]);
              setSelectedFiles(uploadedFiles);
              onFileSelect(uploadedFiles[0], uploadedFiles);
            }

            setProcessingMessage(`완료! ${uploadedFiles.length}페이지 변환됨`);
            setTimeout(() => {
              setProcessingMessage('');
              setConversionProgress(null);
            }, 2000);
          } catch (error: any) {
            console.error('PDF 변환 오류:', error);
            alert(`PDF 변환 실패: ${error.message}`);
          } finally {
            setIsProcessing(false);
          }
          return;
        }

        // 15MB 이하 PDF 또는 일반 이미지 처리
        // 대용량 파일 경고 (10MB 이상)
        if (file.size > 10 * 1024 * 1024) {
          const proceed = window.confirm(
            `파일 크기: ${sizeInMB}MB\n\n` +
            `업로드 및 분석에 시간이 오래 걸릴 수 있습니다.\n` +
            `계속하시겠습니까?`
          );
          if (!proceed) return;
        }

        setIsProcessing(true);
        setProcessingMessage('파일 처리 중...');
        try {
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
          setProcessingMessage('');
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

        {/* 개인정보 보호 안내 */}
        <View style={styles.privacyNotice}>
          <View style={styles.privacyHeader}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={styles.privacyTitle}>개인정보 보호</Text>
          </View>
          <View style={styles.privacyContent}>
            <Text style={styles.privacyText}>
              • 업로드된 파일은 <Text style={styles.privacyBold}>면접 리뷰 목적으로만</Text> 사용됩니다
            </Text>
            <Text style={styles.privacyText}>
              • 모든 데이터는 <Text style={styles.privacyBold}>로컬에만 저장</Text>되며 서버에 저장되지 않습니다
            </Text>
            <Text style={styles.privacyText}>
              • 서비스 운영자는 <Text style={styles.privacyBold}>절대 열람할 수 없습니다</Text>
            </Text>
            <Text style={styles.privacyText}>
              • 대화 종료 시 OpenAI 서버에서도 자동으로 삭제됩니다
            </Text>
          </View>
        </View>

        <Text style={styles.sizeLimit}>• 이미지: 최대 6개 선택 가능 (자동 강력 압축)</Text>
        <Text style={styles.sizeLimit}>• PDF: 15MB 이하 직접 업로드</Text>
        <Text style={styles.sizeLimit}>• 대용량 PDF (60MB+): 처음 15페이지만 자동 변환 ✨</Text>
        <Text style={styles.sizeTip}>💡 모든 이미지는 자동으로 400px 크기로 압축됩니다 (최대 2.5MB)</Text>
      </View>

      {/* 예시 질문 섹션 */}
      <View style={styles.exampleSection}>
        <View style={styles.exampleHeader}>
          <Text style={styles.exampleIcon}>💬</Text>
          <Text style={styles.exampleTitle}>어떤 질문을 받게 되나요?</Text>
        </View>

        <Text style={styles.exampleSubtitle}>직무와 경력에 따라 실제 면접처럼 맞춤형 질문을 받습니다</Text>

        <View style={styles.exampleCards}>
          <View style={styles.exampleCard}>
            <Text style={styles.exampleCardBadge}>디자이너</Text>
            <Text style={styles.exampleCardText}>
              "이 인터페이스에서 파란색 그라디언트를 선택하신 이유가 있나요?"
            </Text>
            <Text style={styles.exampleCardText}>
              "타이포그래피 위계가 명확하지 않은 것 같은데 의도하신 건가요?"
            </Text>
          </View>

          <View style={styles.exampleCard}>
            <Text style={styles.exampleCardBadge}>개발자</Text>
            <Text style={styles.exampleCardText}>
              "Context API 대신 Redux를 선택하신 구체적인 이유가 뭔가요?"
            </Text>
            <Text style={styles.exampleCardText}>
              "이 컴포넌트 구조가 재사용성 측면에서 최선이었을까요?"
            </Text>
          </View>

          <View style={styles.exampleCard}>
            <Text style={styles.exampleCardBadge}>기획자</Text>
            <Text style={styles.exampleCardText}>
              "이 기능의 우선순위를 어떤 기준으로 정하셨나요?"
            </Text>
            <Text style={styles.exampleCardText}>
              "사용자 리서치 데이터가 실제로 어떻게 반영되었나요?"
            </Text>
          </View>
        </View>

        <View style={styles.exampleFeatures}>
          <View style={styles.exampleFeature}>
            <Text style={styles.exampleFeatureIcon}>✅</Text>
            <Text style={styles.exampleFeatureText}>포트폴리오의 구체적인 요소를 직접 언급</Text>
          </View>
          <View style={styles.exampleFeature}>
            <Text style={styles.exampleFeatureIcon}>✅</Text>
            <Text style={styles.exampleFeatureText}>압박 면접 포함, 실전처럼 진행</Text>
          </View>
          <View style={styles.exampleFeature}>
            <Text style={styles.exampleFeatureIcon}>✅</Text>
            <Text style={styles.exampleFeatureText}>답변 맥락을 추적하며 심화 질문</Text>
          </View>
          <View style={styles.exampleFeature}>
            <Text style={styles.exampleFeatureIcon}>✅</Text>
            <Text style={styles.exampleFeatureText}>회사별 채용 기준에 맞춘 질문</Text>
          </View>
        </View>
      </View>

      <View style={styles.uploadArea}>
        {!selectedFile ? (
          <>
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconText}>📎</Text>
            </View>
            <Text style={styles.uploadText}>
              {isProcessing
                ? (processingMessage || '파일 처리 중...')
                : '파일을 선택해주세요 (여러 개 가능)'}
            </Text>
            {conversionProgress && conversionProgress.total > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(conversionProgress.current / conversionProgress.total) * 100}%` }
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {conversionProgress.current} / {conversionProgress.total} 페이지
                </Text>
              </View>
            )}
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
  privacyNotice: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#0EA5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369A1',
  },
  privacyContent: {
    gap: 8,
  },
  privacyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  privacyBold: {
    fontWeight: '700',
    color: '#0369A1',
  },
  exampleSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  exampleIcon: {
    fontSize: 24,
  },
  exampleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  exampleSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  exampleCards: {
    gap: 12,
    marginBottom: 20,
  },
  exampleCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  exampleCardBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0066FF',
    marginBottom: 4,
  },
  exampleCardText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  exampleFeatures: {
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  exampleFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exampleFeatureIcon: {
    fontSize: 16,
  },
  exampleFeatureText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    lineHeight: 20,
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
  progressContainer: {
    width: '100%',
    maxWidth: 300,
    marginTop: 16,
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
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
