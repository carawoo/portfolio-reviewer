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

// 이미지를 리사이즈하고 압축 (GPT-4o Vision 분석 품질 유지하면서 페이로드 제한 준수)
const resizeAndCompressImage = (file: Blob, highQuality: boolean = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new (window as any).Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // GPT-4o Vision이 텍스트를 제대로 읽을 수 있도록 적정 해상도 유지
      const MAX_SIZE = 1200; // GPT-4o Vision OCR에 적합한 크기
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

      // 텍스트 인식을 위한 적정 품질 유지
      const quality = 0.75;
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              const sizeInMB = (base64.length * 0.75) / (1024 * 1024);
              console.log(`압축 후 크기: ${sizeInMB.toFixed(3)}MB (OCR 최적화)`);

              URL.revokeObjectURL(url);
              resolve(base64);
            };
            reader.onerror = reject;
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        },
        'image/jpeg',
        quality
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

// PDF에서 텍스트 추출 (이미지 변환 대신 사용)
const extractTextFromPdf = async (file: Blob): Promise<string> => {
  try {
    await loadPdfJs();

    if (!window.pdfjsLib) {
      throw new Error('PDF.js 라이브러리를 로드할 수 없습니다.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    let fullText = '';

    // 모든 페이지에서 텍스트 추출
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // 텍스트 아이템들을 결합
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += `\n\n=== 페이지 ${pageNum} ===\n${pageText}`;
    }

    console.log(`PDF 텍스트 추출 완료: ${numPages}페이지, ${fullText.length}자`);
    return fullText.trim();
  } catch (error) {
    console.error('PDF 텍스트 추출 오류:', error);
    throw new Error('PDF에서 텍스트를 추출할 수 없습니다.');
  }
};

// PDF를 이미지 배열로 변환 (크기에 따라 품질 조절)
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

    // 페이지 수에 따라 해상도와 품질 자동 조절
    const fileSizeMB = file.size / (1024 * 1024);

    // 모든 페이지 처리 (제한 없음)
    const pagesToProcess = numPages;

    // 페이로드 제한(4.5MB) 고려하되, GPT-4o Vision OCR 품질도 유지
    let SCALE: number;
    let quality: 'high' | 'medium' | 'low';

    if (numPages <= 5) {
      SCALE = 2.5; // 5장 이하: 고해상도 (OCR 최적)
      quality = 'high';
    } else if (numPages <= 10) {
      SCALE = 2.0; // 10장 이하: 중고해상도
      quality = 'high';
    } else if (numPages <= 20) {
      SCALE = 1.5; // 20장 이하: 중해상도
      quality = 'medium';
    } else {
      SCALE = 1.2; // 21장 이상: 기본 해상도
      quality = 'medium';
    }

    console.log(`PDF 분석: ${numPages}페이지, 크기 ${fileSizeMB.toFixed(1)}MB`);
    console.log(`품질 모드: ${quality} (scale: ${SCALE})`);
    console.log(`모든 ${pagesToProcess}페이지 처리 예정`);

    // 각 페이지를 이미지로 변환
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      onProgress?.(pageNum, pagesToProcess);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: SCALE }); // 크기에 따라 해상도 조절

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context!,
        viewport: viewport,
      }).promise;

      // 품질 모드에 따라 압축률 조절 (OCR 품질과 페이로드 제한 균형)
      const blobQuality = quality === 'high' ? 0.8 : quality === 'medium' ? 0.7 : 0.6;
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          },
          'image/jpeg',
          blobQuality
        );
      });

      // 이미지 압축 (페이로드 제한 때문에 고품질 사용 안 함)
      const base64 = await resizeAndCompressImage(blob, false);

      const uriQuality = blobQuality;
      uploadedFiles.push({
        uri: canvas.toDataURL('image/jpeg', uriQuality),
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
  const [showProjectTip, setShowProjectTip] = useState(true);

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

        if (totalSize > 4.0) {
          alert(`압축 후 총 크기가 ${totalSize.toFixed(2)}MB입니다.\n이미지를 더 적게 선택하거나 해상도가 낮은 이미지를 사용해주세요.\n(최대 4.0MB까지 업로드 가능)`);
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

        // PDF인 경우: 항상 이미지로 변환 (Vision 모델이 텍스트+이미지 모두 분석)
        if (isPdf) {
          setIsProcessing(true);
          setProcessingMessage('PDF를 이미지로 변환 중...');
          setConversionProgress({ current: 0, total: 0 });

          try {
            console.log('📄 PDF를 이미지로 변환 (Vision 모델용)');

            const uploadedFiles = await convertPdfToImages(file, (current, total) => {
              setConversionProgress({ current, total });
              setProcessingMessage(`페이지 변환 중: ${current}/${total}`);
            });

            // 변환 완료 후 총 크기 확인
            const totalSize = uploadedFiles.reduce((sum, f) => {
              return sum + (f.base64 ? (f.base64.length * 0.75) / (1024 * 1024) : 0);
            }, 0);

            console.log(`총 변환 크기: ${totalSize.toFixed(2)}MB`);

            // 크기 확인 (4.0MB까지 허용 - Vercel 4.5MB 제한에 여유 둠)
            if (totalSize > 4.0) {
              alert(
                `변환 후 총 크기가 ${totalSize.toFixed(2)}MB입니다.\n\n` +
                `서버 전송 제한(4.0MB)을 초과하여 일부 페이지만 업로드합니다.\n` +
                `처음부터 약 ${Math.floor(4.0 / (totalSize / uploadedFiles.length))}페이지만 포함됩니다.`
              );
              // 4.0MB 이하가 될 때까지 페이지 제거
              let currentSize = 0;
              const limitedFiles: UploadedFile[] = [];
              for (const file of uploadedFiles) {
                const fileSize = file.base64 ? (file.base64.length * 0.75) / (1024 * 1024) : 0;
                if (currentSize + fileSize <= 4.0) {
                  limitedFiles.push(file);
                  currentSize += fileSize;
                } else {
                  break;
                }
              }
              console.log(`⚠️ 크기 제한으로 ${limitedFiles.length}/${uploadedFiles.length}페이지만 업로드 (${currentSize.toFixed(2)}MB)`);
              setSelectedFile(limitedFiles[0]);
              setSelectedFiles(limitedFiles);
              onFileSelect(limitedFiles[0], limitedFiles);
            } else {
              console.log(`✅ 전체 ${uploadedFiles.length}페이지 업로드 (${totalSize.toFixed(2)}MB)`);
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
            console.error('PDF 처리 오류:', error);
            alert(`PDF 처리 실패: ${error.message}\n\n다른 PDF 파일을 시도해보세요.`);
          } finally {
            setIsProcessing(false);
          }
          return;
        }

        // 이미지 파일 처리
        setIsProcessing(true);
        setProcessingMessage('파일 처리 중...');
        try {
          const base64 = await resizeAndCompressImage(file);

          const uploadedFile: UploadedFile = {
            uri: URL.createObjectURL(file),
            name: file.name,
            type: 'image',
            mimeType: 'image/jpeg',
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
        <Text style={styles.title}>문서 업로드</Text>
        <Text style={styles.subtitle}>포트폴리오, 이력서, 경력기술서 등을 업로드해주세요</Text>

        {/* 프로젝트 팁 */}
        {showProjectTip && (
          <View style={styles.projectTip}>
            <View style={styles.projectTipHeader}>
              <Text style={styles.projectTipIcon}>💡</Text>
              <Text style={styles.projectTipTitle}>효과적인 면접 연습 방법</Text>
              <TouchableOpacity onPress={() => setShowProjectTip(false)} style={styles.projectTipClose}>
                <Text style={styles.projectTipCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.projectTipText}>
              <Text style={styles.projectTipBold}>하나의 프로젝트</Text>씩 자신있는 내용으로 면접 시뮬레이션을 진행하세요
            </Text>
            <Text style={styles.projectTipSubtext}>
              • 프로젝트별로 집중 연습하면 더 깊이 있는 질문과 답변이 가능합니다{'\n'}
              • 여러 프로젝트가 있다면 각각 별도로 연습해보세요
            </Text>
          </View>
        )}

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

        <Text style={styles.sizeLimit}>• 이미지: 최대 6개 선택 가능 (고품질 유지)</Text>
        <Text style={styles.sizeLimit}>• PDF: 모든 페이지 처리 (페이지 수에 따라 자동 최적화)</Text>
        <Text style={styles.sizeTip}>💡 PDF는 5장씩 분석되어 정확하고 빠르게 처리됩니다</Text>
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
  projectTip: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  projectTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  projectTipIcon: {
    fontSize: 18,
  },
  projectTipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D97706',
    flex: 1,
  },
  projectTipClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectTipCloseText: {
    fontSize: 14,
    color: '#666',
  },
  projectTipText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 8,
  },
  projectTipBold: {
    fontWeight: '700',
    color: '#D97706',
  },
  projectTipSubtext: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    opacity: 0.8,
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
