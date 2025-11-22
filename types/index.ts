// 메시지 타입
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isDifficult?: boolean; // 어려웠던 질문 표시
}

// 파일 타입
export interface UploadedFile {
  uri: string;
  name: string;
  type: 'image' | 'pdf';
  mimeType: string;
  base64?: string;
  extractedText?: string; // PDF에서 추출한 텍스트 (있으면 이미지 대신 사용)
}

// 회사 정보 타입
export interface Company {
  id: string;
  name: string;
  industry: string;
  interviewFocus: string[];
  portfolioTips: string[];
  commonQuestions: string[];
  jobPosting?: string; // 채용 공고 내용 (선택)
}

// 직무 타입
export type Position = 'designer' | 'frontend' | 'backend' | 'fullstack' | 'pm' | 'marketer' | 'other';

// 경력 타입
export type Experience = 'junior' | 'mid' | 'senior';

// 분석 요청 타입
export interface AnalysisRequest {
  file: UploadedFile;
  files?: UploadedFile[]; // 여러 파일 지원
  company: Company;
  position: Position;
  experience: Experience;
  conversationHistory: Message[];
  portfolioAnalysis?: string; // 포트폴리오 분석 결과 (첫 요청 후 저장)
}

// 분석 응답 타입
export interface AnalysisResponse {
  message: string;
  suggestions?: string[];
  nextQuestion?: string;
  portfolioAnalysis?: string; // 포트폴리오 분석 결과 (클라이언트가 저장)
}

// 면접 기록 타입
export interface InterviewRecord {
  id: string;
  company: Company;
  position: Position;
  experience: Experience;
  messages: Message[];
  createdAt: Date;
  difficultQuestions: string[]; // 어려웠던 질문 ID 리스트
}
