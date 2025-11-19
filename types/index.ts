// 메시지 타입
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// 파일 타입
export interface UploadedFile {
  uri: string;
  name: string;
  type: 'image' | 'pdf';
  mimeType: string;
  base64?: string;
}

// 회사 정보 타입
export interface Company {
  id: string;
  name: string;
  industry: string;
  interviewFocus: string[];
  portfolioTips: string[];
  commonQuestions: string[];
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
}

// 분석 응답 타입
export interface AnalysisResponse {
  message: string;
  suggestions?: string[];
  nextQuestion?: string;
}
