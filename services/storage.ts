import { InterviewRecord, Message, Company, Position, Experience } from '../types';
import { Platform } from 'react-native';

const STORAGE_KEY = 'interview_records';

/**
 * 면접 기록 저장
 */
export const saveInterviewRecord = (
  company: Company,
  position: Position,
  experience: Experience,
  messages: Message[],
  difficultQuestionIds: string[]
): InterviewRecord => {
  // 웹 환경에서만 LocalStorage 사용
  if (Platform.OS !== 'web') {
    console.warn('Storage is only available on web platform');
    return {
      id: Date.now().toString(),
      company,
      position,
      experience,
      messages,
      createdAt: new Date(),
      difficultQuestions: difficultQuestionIds,
    };
  }

  const record: InterviewRecord = {
    id: Date.now().toString(),
    company,
    position,
    experience,
    messages,
    createdAt: new Date(),
    difficultQuestions: difficultQuestionIds,
  };

  try {
    const existingRecords = getInterviewRecords();
    const updatedRecords = [record, ...existingRecords];

    // 최대 20개까지만 저장
    const recordsToSave = updatedRecords.slice(0, 20);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(recordsToSave));
    return record;
  } catch (error) {
    console.error('Failed to save interview record:', error);
    return record;
  }
};

/**
 * 저장된 면접 기록 가져오기
 */
export const getInterviewRecords = (): InterviewRecord[] => {
  if (Platform.OS !== 'web') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const records = JSON.parse(stored);

    // Date 객체 복원
    return records.map((record: any) => ({
      ...record,
      createdAt: new Date(record.createdAt),
      messages: record.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Failed to load interview records:', error);
    return [];
  }
};

/**
 * 특정 면접 기록 가져오기
 */
export const getInterviewRecord = (id: string): InterviewRecord | null => {
  const records = getInterviewRecords();
  return records.find(record => record.id === id) || null;
};

/**
 * 면접 기록 삭제
 */
export const deleteInterviewRecord = (id: string): void => {
  if (Platform.OS !== 'web') {
    return;
  }

  try {
    const records = getInterviewRecords();
    const filtered = records.filter(record => record.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete interview record:', error);
  }
};

/**
 * 어려웠던 질문만 필터링
 */
export const getDifficultQuestions = (record: InterviewRecord): Message[] => {
  return record.messages.filter(msg =>
    msg.role === 'assistant' && record.difficultQuestions.includes(msg.id)
  );
};
