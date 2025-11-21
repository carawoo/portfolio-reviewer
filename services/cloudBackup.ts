import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { InterviewRecord, UploadedFile, Company, Position, Experience, Message } from '../types';

/**
 * 사용자가 동의한 경우에만 클라우드에 면접 기록 저장 (텍스트만)
 * 파일은 로컬에만 저장되며 클라우드에 업로드하지 않음
 */
export const saveInterviewToCloud = async (
  record: InterviewRecord,
  files?: UploadedFile[]
): Promise<string> => {
  try {
    // Firestore에 면접 기록 저장 (파일 제외)
    const docRef = await addDoc(collection(db, 'interviews'), {
      company: {
        name: record.company.name,
        industry: record.company.industry,
        interviewFocus: record.company.interviewFocus,
      },
      position: record.position,
      experience: record.experience,
      messages: record.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: Timestamp.fromDate(m.timestamp),
      })),
      difficultQuestions: record.difficultQuestions,
      fileCount: files ? files.length : 0, // 파일 개수만 저장
      createdAt: Timestamp.fromDate(record.createdAt),
      userConsent: true, // 사용자가 동의했음을 명시
    });

    return docRef.id;
  } catch (error) {
    console.error('클라우드 저장 실패:', error);
    throw new Error('클라우드에 저장하지 못했습니다.');
  }
};

/**
 * 클라우드에서 면접 기록 불러오기
 */
export const loadInterviewsFromCloud = async (): Promise<InterviewRecord[]> => {
  try {
    const q = query(collection(db, 'interviews'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        company: data.company as Company,
        position: data.position as Position,
        experience: data.experience as Experience,
        messages: data.messages.map((m: any) => ({
          ...m,
          timestamp: m.timestamp.toDate(),
        })) as Message[],
        difficultQuestions: data.difficultQuestions || [],
        createdAt: data.createdAt.toDate(),
      };
    });
  } catch (error) {
    console.error('클라우드 로드 실패:', error);
    throw new Error('클라우드에서 불러오지 못했습니다.');
  }
};

/**
 * Analytics 이벤트 로깅
 */
export const logAnalyticsEvent = (eventName: string, params?: any) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
};
