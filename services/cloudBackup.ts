import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { InterviewRecord, UploadedFile, Company, Position, Experience, Message } from '../types';

/**
 * 사용자가 동의한 경우에만 클라우드에 면접 기록 저장
 */
export const saveInterviewToCloud = async (
  record: InterviewRecord,
  files?: UploadedFile[]
): Promise<string> => {
  try {
    // 파일 업로드 (있는 경우)
    let fileUrls: string[] = [];
    if (files && files.length > 0) {
      fileUrls = await Promise.all(
        files.map(async (file) => {
          const fileRef = ref(storage, `portfolios/${Date.now()}_${file.name}`);

          // base64를 Blob으로 변환
          const base64Data = file.base64 || '';
          const byteCharacters = atob(base64Data.split(',')[1] || base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: file.mimeType });

          await uploadBytes(fileRef, blob);
          return await getDownloadURL(fileRef);
        })
      );
    }

    // Firestore에 면접 기록 저장
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
      fileUrls,
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
