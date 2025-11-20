import {
  saveInterviewRecord,
  getInterviewRecords,
  getInterviewRecord,
  deleteInterviewRecord,
  getDifficultQuestions,
} from './storage';
import { InterviewRecord, Message } from '../types';

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('Storage Service', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  const mockCompany = {
    id: 'test-company',
    name: '테스트 회사',
    industry: 'IT',
    interviewFocus: ['기술'],
    portfolioTips: ['팁1'],
    commonQuestions: ['질문1'],
  };

  const mockPosition = 'frontend' as const;
  const mockExperience = 'mid' as const;

  const mockMessages: Message[] = [
    {
      id: 'msg1',
      role: 'assistant',
      content: '질문1',
      timestamp: new Date(),
    },
    {
      id: 'msg2',
      role: 'user',
      content: '답변1',
      timestamp: new Date(),
    },
  ];

  describe('saveInterviewRecord', () => {
    it('면접 기록을 저장해야 한다', () => {
      const record = saveInterviewRecord(
        mockCompany,
        mockPosition,
        mockExperience,
        mockMessages,
        ['msg1']
      );

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.company).toEqual(mockCompany);
      expect(record.position).toBe(mockPosition);
      expect(record.experience).toBe(mockExperience);
      expect(record.messages).toEqual(mockMessages);
      expect(record.difficultQuestions).toEqual(['msg1']);
    });

    it('저장된 기록을 localStorage에서 가져올 수 있어야 한다', () => {
      saveInterviewRecord(
        mockCompany,
        mockPosition,
        mockExperience,
        mockMessages,
        ['msg1']
      );

      const records = getInterviewRecords();
      expect(records).toHaveLength(1);
      expect(records[0].company.name).toBe('테스트 회사');
    });

    it('최대 20개까지만 저장해야 한다', () => {
      // 21개의 기록 저장
      for (let i = 0; i < 21; i++) {
        saveInterviewRecord(
          { ...mockCompany, id: `company-${i}` },
          mockPosition,
          mockExperience,
          mockMessages,
          []
        );
      }

      const records = getInterviewRecords();
      expect(records).toHaveLength(20);
    });
  });

  describe('getInterviewRecords', () => {
    it('빈 배열을 반환해야 한다 (저장된 기록이 없을 때)', () => {
      const records = getInterviewRecords();
      expect(records).toEqual([]);
    });

    it('모든 저장된 기록을 반환해야 한다', () => {
      saveInterviewRecord(mockCompany, mockPosition, mockExperience, mockMessages, []);
      saveInterviewRecord(
        { ...mockCompany, name: '회사2' },
        mockPosition,
        mockExperience,
        mockMessages,
        []
      );

      const records = getInterviewRecords();
      expect(records).toHaveLength(2);
    });

    it('Date 객체를 올바르게 복원해야 한다', () => {
      saveInterviewRecord(mockCompany, mockPosition, mockExperience, mockMessages, []);

      const records = getInterviewRecords();
      expect(records[0].createdAt).toBeInstanceOf(Date);
      expect(records[0].messages[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('getInterviewRecord', () => {
    it('특정 ID의 기록을 반환해야 한다', () => {
      const saved = saveInterviewRecord(
        mockCompany,
        mockPosition,
        mockExperience,
        mockMessages,
        []
      );

      const record = getInterviewRecord(saved.id);
      expect(record).toBeDefined();
      expect(record?.id).toBe(saved.id);
    });

    it('존재하지 않는 ID는 null을 반환해야 한다', () => {
      const record = getInterviewRecord('non-existent-id');
      expect(record).toBeNull();
    });
  });

  describe('deleteInterviewRecord', () => {
    it('특정 기록을 삭제해야 한다', () => {
      const saved = saveInterviewRecord(
        mockCompany,
        mockPosition,
        mockExperience,
        mockMessages,
        []
      );

      // 삭제 전 확인
      let records = getInterviewRecords();
      expect(records).toHaveLength(1);

      deleteInterviewRecord(saved.id);

      // 삭제 후 확인
      records = getInterviewRecords();
      expect(records).toHaveLength(0);
    });

    it.skip('다른 기록은 유지해야 한다', () => {
      // 첫 번째 기록 저장
      saveInterviewRecord(
        mockCompany,
        mockPosition,
        mockExperience,
        mockMessages,
        []
      );

      // 두 번째 기록 저장
      const saved2 = saveInterviewRecord(
        { ...mockCompany, id: 'company-2', name: '회사2' },
        mockPosition,
        mockExperience,
        mockMessages,
        []
      );

      // 2개 저장되었는지 확인
      let records = getInterviewRecords();
      expect(records).toHaveLength(2);

      // saved2 삭제
      deleteInterviewRecord(saved2.id);

      // 1개만 남았는지 확인
      records = getInterviewRecords();
      expect(records).toHaveLength(1);
      expect(records[0].company.name).toBe('테스트 회사');
    });
  });

  describe('getDifficultQuestions', () => {
    it('어려웠던 질문만 필터링해야 한다', () => {
      const messages: Message[] = [
        {
          id: 'msg1',
          role: 'assistant',
          content: '질문1',
          timestamp: new Date(),
        },
        {
          id: 'msg2',
          role: 'user',
          content: '답변1',
          timestamp: new Date(),
        },
        {
          id: 'msg3',
          role: 'assistant',
          content: '질문2',
          timestamp: new Date(),
        },
      ];

      const record: InterviewRecord = {
        id: '1',
        company: mockCompany,
        position: mockPosition,
        experience: mockExperience,
        messages,
        createdAt: new Date(),
        difficultQuestions: ['msg1', 'msg3'],
      };

      const difficult = getDifficultQuestions(record);
      expect(difficult).toHaveLength(2);
      expect(difficult[0].id).toBe('msg1');
      expect(difficult[1].id).toBe('msg3');
    });

    it('어려운 질문이 없으면 빈 배열을 반환해야 한다', () => {
      const record: InterviewRecord = {
        id: '1',
        company: mockCompany,
        position: mockPosition,
        experience: mockExperience,
        messages: mockMessages,
        createdAt: new Date(),
        difficultQuestions: [],
      };

      const difficult = getDifficultQuestions(record);
      expect(difficult).toEqual([]);
    });
  });
});
