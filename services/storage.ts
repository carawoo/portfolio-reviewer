import { InterviewRecord, Message, Company, Position, Experience, UploadedFile } from '../types';
import { Platform } from 'react-native';
import { saveInterviewToCloud, loadInterviewsFromCloud } from './cloudBackup';

const STORAGE_KEY = 'interview_records';
const CONSENT_KEY = 'cloud_backup_consent';

/**
 * 클라우드 백업 동의 여부 확인
 */
export const getCloudBackupConsent = (): boolean => {
  if (Platform.OS !== 'web') return false;
  try {
    const consent = localStorage.getItem(CONSENT_KEY);
    return consent === 'true';
  } catch {
    return false;
  }
};

/**
 * 클라우드 백업 동의 설정
 */
export const setCloudBackupConsent = (consent: boolean): void => {
  if (Platform.OS !== 'web') return;
  try {
    localStorage.setItem(CONSENT_KEY, consent.toString());
  } catch (error) {
    console.error('Failed to save consent:', error);
  }
};

/**
 * 면접 기록 저장 (로컬 + 클라우드)
 */
export const saveInterviewRecord = async (
  company: Company,
  position: Position,
  experience: Experience,
  messages: Message[],
  difficultQuestionIds: string[],
  files?: UploadedFile[]
): Promise<InterviewRecord> => {
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
    // 로컬 스토리지에 저장
    const existingRecords = getInterviewRecords();
    const updatedRecords = [record, ...existingRecords];
    const recordsToSave = updatedRecords.slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recordsToSave));

    // 사용자가 동의한 경우 클라우드에도 저장
    if (getCloudBackupConsent()) {
      try {
        await saveInterviewToCloud(record, files);
        console.log('✅ 클라우드 백업 완료');
      } catch (cloudError) {
        console.error('❌ 클라우드 백업 실패 (로컬에는 저장됨):', cloudError);
        // 클라우드 실패해도 로컬 저장은 성공
      }
    }

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
