import axios from 'axios';
import { AnalysisRequest, AnalysisResponse, Message, UploadedFile } from '../types';
import { Platform } from 'react-native';
import { getErrorMessage } from '../utils/errorHandler';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '/api';

/**
 * 파일을 base64로 인코딩
 */
export const fileToBase64 = async (file: UploadedFile): Promise<string> => {
  try {
    if (file.base64) {
      return file.base64;
    }

    // 웹 환경에서는 이미 base64가 있어야 함
    if (Platform.OS === 'web') {
      throw new Error('웹에서는 base64 데이터가 필요합니다.');
    }

    // 모바일에서만 FileSystem 사용
    const FileSystem = await import('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: 'base64',
    });

    return base64;
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw new Error('파일을 읽을 수 없습니다.');
  }
};

/**
 * 포트폴리오 분석 요청
 */
export const analyzePortfolio = async (
  request: AnalysisRequest
): Promise<AnalysisResponse> => {
  try {
    // extractedText가 있으면 base64 변환 건너뛰기 (PDF 텍스트 추출 성공)
    const base64File = request.file.extractedText ? undefined : await fileToBase64(request.file);

    // 여러 파일이 있는 경우 각각 처리 (uri 제거하여 페이로드 크기 절반으로 줄임)
    let base64Files;
    if (request.files && request.files.length > 0) {
      base64Files = await Promise.all(
        request.files.map(async (file) => ({
          name: file.name,
          type: file.type,
          mimeType: file.mimeType,
          extractedText: file.extractedText,
          // extractedText가 있으면 base64 변환 안 함
          base64: file.extractedText ? undefined : await fileToBase64(file),
          // uri는 서버에 보내지 않음 (중복 데이터 제거)
        }))
      );
    }

    const response = await axios.post<AnalysisResponse>(
      `${API_BASE_URL}/analyze`,
      {
        file: {
          name: request.file.name,
          type: request.file.type,
          mimeType: request.file.mimeType,
          extractedText: request.file.extractedText,
          base64: base64File,
          // uri는 서버에 보내지 않음 (중복 데이터 제거)
        },
        files: base64Files,
        company: request.company,
        position: request.position,
        experience: request.experience,
        conversationHistory: request.conversationHistory,
        portfolioAnalysis: request.portfolioAnalysis, // 추가: 포트폴리오 분석 결과 전달
      },
      {
        timeout: 180000, // 3분 타임아웃 (대용량 PDF 처리)
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    throw new Error(`분석 요청 실패: ${errorMsg}`);
  }
};

/**
 * 대화 시작 (초기 질문 생성)
 */
export const startConversation = async (
  file: UploadedFile,
  companyName: string
): Promise<AnalysisResponse> => {
  try {
    const base64File = await fileToBase64(file);

    const response = await axios.post<AnalysisResponse>(
      `${API_BASE_URL}/start`,
      {
        file: {
          ...file,
          base64: base64File,
        },
        companyName,
      },
      {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    throw new Error(`대화 시작 실패: ${errorMsg}`);
  }
};

/**
 * 회사 정보 검색 (AI 기반)
 */
export const searchCompanyInfo = async (
  companyName: string,
  position?: string,
  jobPosting?: string
): Promise<{ company: any }> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/search-company`,
      {
        companyName,
        position,
        jobPosting,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    throw new Error(`회사 정보 검색 실패: ${errorMsg}`);
  }
};
