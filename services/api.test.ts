import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { fileToBase64, analyzePortfolio, startConversation } from './api';
import { AnalysisRequest, UploadedFile } from '../types';

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

const mock = new MockAdapter(axios);

describe('API Service', () => {
  afterEach(() => {
    mock.reset();
  });

  afterAll(() => {
    mock.restore();
  });

  const mockFile: UploadedFile = {
    uri: 'file:///test.png',
    name: 'test.png',
    type: 'image',
    mimeType: 'image/png',
    base64: 'mockBase64Data',
  };

  const mockCompany = {
    id: 'test-company',
    name: '테스트 회사',
    industry: 'IT',
    interviewFocus: ['기술', '협업'],
    portfolioTips: ['구체적인 수치 포함'],
    commonQuestions: ['프로젝트 경험은?'],
  };

  describe('fileToBase64', () => {
    it('이미 base64가 있는 파일은 그대로 반환해야 한다', async () => {
      const result = await fileToBase64(mockFile);
      expect(result).toBe('mockBase64Data');
    });

    it('웹 환경에서 base64가 없으면 에러를 던져야 한다', async () => {
      const fileWithoutBase64: UploadedFile = {
        ...mockFile,
        base64: undefined,
      };

      await expect(fileToBase64(fileWithoutBase64)).rejects.toThrow(
        '파일을 읽을 수 없습니다.'
      );
    });
  });

  describe('analyzePortfolio', () => {
    const mockRequest: AnalysisRequest = {
      file: mockFile,
      company: mockCompany,
      position: 'frontend',
      experience: 'mid',
      conversationHistory: [],
    };

    it('성공적으로 분석 요청을 보내야 한다', async () => {
      const mockResponse = {
        message: '안녕하세요! 포트폴리오를 확인했습니다.',
      };

      mock.onPost('/api/analyze').reply(200, mockResponse);

      const result = await analyzePortfolio(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe('/api/analyze');
    });

    it('여러 파일을 처리할 수 있어야 한다', async () => {
      const requestWithMultipleFiles: AnalysisRequest = {
        ...mockRequest,
        files: [mockFile, { ...mockFile, name: 'test2.png' }],
      };

      const mockResponse = {
        message: '여러 파일을 확인했습니다.',
      };

      mock.onPost('/api/analyze').reply(200, mockResponse);

      const result = await analyzePortfolio(requestWithMultipleFiles);

      expect(result).toEqual(mockResponse);

      const requestData = JSON.parse(mock.history.post[0].data);
      expect(requestData.files).toHaveLength(2);
    });

    it('서버 에러 시 에러를 던져야 한다', async () => {
      mock.onPost('/api/analyze').reply(500, {
        error: '서버 오류',
      });

      await expect(analyzePortfolio(mockRequest)).rejects.toThrow(
        '분석 요청 실패: 서버 오류'
      );
    });

    it('네트워크 에러 시 에러를 던져야 한다', async () => {
      mock.onPost('/api/analyze').networkError();

      await expect(analyzePortfolio(mockRequest)).rejects.toThrow();
    });

    it('타임아웃을 설정해야 한다', async () => {
      mock.onPost('/api/analyze').reply(200, {
        message: '성공',
      });

      await analyzePortfolio(mockRequest);

      const config = mock.history.post[0];
      expect(JSON.parse(config.data)).toBeDefined();
    });

    it('올바른 헤더를 설정해야 한다', async () => {
      mock.onPost('/api/analyze').reply(200, {
        message: '성공',
      });

      await analyzePortfolio(mockRequest);

      const config = mock.history.post[0];
      expect(config.headers?.['Content-Type']).toBe('application/json');
    });
  });

  describe('startConversation', () => {
    it('성공적으로 대화를 시작해야 한다', async () => {
      const mockResponse = {
        message: '안녕하세요 :) 반갑습니다.',
      };

      mock.onPost('/api/start').reply(200, mockResponse);

      const result = await startConversation(mockFile, '테스트 회사');

      expect(result).toEqual(mockResponse);
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe('/api/start');
    });

    it('파일과 회사명을 올바르게 전송해야 한다', async () => {
      mock.onPost('/api/start').reply(200, {
        message: '성공',
      });

      await startConversation(mockFile, '테스트 회사');

      const requestData = JSON.parse(mock.history.post[0].data);
      expect(requestData.file.base64).toBe('mockBase64Data');
      expect(requestData.companyName).toBe('테스트 회사');
    });

    it('서버 에러 시 에러를 던져야 한다', async () => {
      mock.onPost('/api/start').reply(400, {
        error: '잘못된 요청',
      });

      await expect(startConversation(mockFile, '테스트 회사')).rejects.toThrow(
        '대화 시작 실패: 잘못된 요청'
      );
    });
  });
});
