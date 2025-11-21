import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, TouchableOpacity, Text, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FileUpload } from './components/FileUpload';
import { CompanySelector } from './components/CompanySelector';
import { ChatInterface } from './components/ChatInterface';
import { InterviewReview } from './components/InterviewReview';
import { SavedInterviews } from './components/SavedInterviews';
import { SaveSuccessModal } from './components/SaveSuccessModal';
import { UploadedFile, Company, Message, Position, Experience, InterviewRecord } from './types';
import { analyzePortfolio } from './services/api';
import { saveInterviewRecord, getDifficultQuestions, getCloudBackupConsent, setCloudBackupConsent } from './services/storage';
import { getErrorMessage, logError } from './utils/errorHandler';
import { ConsentModal } from './components/ConsentModal';

type Step = 'upload' | 'company' | 'chat' | 'review' | 'saved' | 'viewRecord';

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InterviewRecord | null>(null);
  const [showDifficultOnly, setShowDifficultOnly] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [lastSavedRecord, setLastSavedRecord] = useState<InterviewRecord | null>(null);
  const [lastDifficultCount, setLastDifficultCount] = useState(0);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentAsked, setConsentAsked] = useState(false);

  const handleFileSelect = (file: UploadedFile, allFiles?: UploadedFile[]) => {
    setUploadedFile(file);
    setUploadedFiles(allFiles || [file]);
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
  };

  const handlePositionSelect = (position: Position) => {
    setSelectedPosition(position);
  };

  const handleExperienceSelect = (experience: Experience) => {
    setSelectedExperience(experience);
  };

  const handleStartAnalysis = async () => {
    if (!uploadedFile || !selectedCompany || !selectedPosition || !selectedExperience) {
      alert('파일, 회사, 직무, 경력을 모두 선택해주세요.');
      return;
    }

    console.log('Starting analysis...', { uploadedFile, selectedCompany });
    setCurrentStep('chat');
    setIsLoading(true);

    try {
      console.log('Calling analyzePortfolio API...');
      const response = await analyzePortfolio({
        file: uploadedFile,
        files: uploadedFiles.length > 1 ? uploadedFiles : undefined,
        company: selectedCompany,
        position: selectedPosition,
        experience: selectedExperience,
        conversationHistory: [],
      });

      console.log('API response received:', response);

      if (!response || !response.message) {
        throw new Error('잘못된 API 응답입니다.');
      }

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      console.log('Setting messages:', [aiMessage]);
      setMessages([aiMessage]);
    } catch (error: any) {
      logError('handleStartAnalysis', error);
      const errorMsg = getErrorMessage(error);
      alert(`오류: ${errorMsg}`);
      setCurrentStep('company');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!uploadedFile || !selectedCompany || !selectedPosition || !selectedExperience) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await analyzePortfolio({
        file: uploadedFile,
        files: uploadedFiles.length > 1 ? uploadedFiles : undefined,
        company: selectedCompany,
        position: selectedPosition,
        experience: selectedExperience,
        conversationHistory: updatedMessages,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages([...updatedMessages, aiMessage]);
    } catch (error: any) {
      logError('handleSendMessage', error);
      const errorMsg = getErrorMessage(error);
      alert(`오류: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setUploadedFiles([]);
    setSelectedCompany(null);
    setSelectedPosition(null);
    setSelectedExperience(null);
    setMessages([]);
  };

  const handleEndInterview = () => {
    if (messages.length === 0) {
      alert('면접 내용이 없습니다.');
      return;
    }
    setCurrentStep('review');
  };

  const handleSaveReview = async (difficultQuestionIds: string[]) => {
    if (!selectedCompany || !selectedPosition || !selectedExperience) {
      alert('회사, 직무, 경력 정보가 필요합니다.');
      return;
    }

    // 첫 저장 시 동의 모달 표시
    if (!consentAsked) {
      setConsentAsked(true);
      setShowConsentModal(true);
      // 동의 후 저장할 데이터 임시 저장
      (window as any).__pendingSave = { difficultQuestionIds };
      return;
    }

    try {
      const savedRecord = await saveInterviewRecord(
        selectedCompany,
        selectedPosition,
        selectedExperience,
        messages,
        difficultQuestionIds,
        uploadedFiles.length > 0 ? uploadedFiles : undefined
      );

      // 모달 표시
      setLastSavedRecord(savedRecord);
      setLastDifficultCount(difficultQuestionIds.length);
      setShowSaveModal(true);
    } catch (error) {
      logError('handleSaveReview', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleViewSavedNow = () => {
    if (lastSavedRecord) {
      setShowSaveModal(false);
      setSelectedRecord(lastSavedRecord);
      setShowDifficultOnly(lastDifficultCount > 0);
      setCurrentStep('viewRecord');
    }
  };

  const handleViewSavedList = () => {
    setShowSaveModal(false);
    setCurrentStep('saved');
  };

  const handleStartNewInterview = () => {
    setShowSaveModal(false);
    handleReset();
  };

  const handleCloseReview = () => {
    setCurrentStep('chat');
  };

  const handleViewSaved = () => {
    setCurrentStep('saved');
  };

  const handleSelectRecord = (record: InterviewRecord) => {
    setSelectedRecord(record);
    setCurrentStep('viewRecord');
  };

  const handleCloseSaved = () => {
    setCurrentStep('upload');
  };

  const handleCloseRecord = () => {
    setSelectedRecord(null);
    setShowDifficultOnly(false);
    setCurrentStep('saved');
  };

  const handleRetryInterview = (record: InterviewRecord) => {
    const confirmed = window.confirm(
      `${record.company.name} 면접을 다시 연습하시겠어요?`
    );

    if (confirmed) {
      // 이전 설정으로 새 면접 시작
      setSelectedCompany(record.company);
      setSelectedPosition(record.position);
      setSelectedExperience(record.experience);
      setMessages([]);
      setUploadedFile(null);
      setUploadedFiles([]);
      setSelectedRecord(null);
      setShowDifficultOnly(false);
      setCurrentStep('upload');
    }
  };

  const handleConsentAccept = async () => {
    setCloudBackupConsent(true);
    setShowConsentModal(false);

    // 대기 중인 저장 실행
    const pendingSave = (window as any).__pendingSave;
    if (pendingSave) {
      delete (window as any).__pendingSave;
      await handleSaveReview(pendingSave.difficultQuestionIds);
    }
  };

  const handleConsentDecline = async () => {
    setCloudBackupConsent(false);
    setShowConsentModal(false);

    // 로컬에만 저장
    const pendingSave = (window as any).__pendingSave;
    if (pendingSave) {
      delete (window as any).__pendingSave;
      await handleSaveReview(pendingSave.difficultQuestionIds);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Modern Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>포트폴리오 리뷰어</Text>
          <Text style={styles.headerSubtitle}>AI 기반 맞춤형 검토</Text>
        </View>
        <View style={styles.headerActions}>
          {currentStep === 'upload' && (
            <TouchableOpacity onPress={handleViewSaved} style={styles.savedButton}>
              <Text style={styles.savedButtonText}>📋</Text>
            </TouchableOpacity>
          )}
          {currentStep === 'chat' && (
            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>↻</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress Steps */}
      {currentStep !== 'chat' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressSteps}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, currentStep === 'upload' && styles.stepDotActive]} />
              <Text style={[styles.stepText, currentStep === 'upload' && styles.stepTextActive]}>
                업로드
              </Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, currentStep === 'company' && styles.stepDotActive]} />
              <Text style={[styles.stepText, currentStep === 'company' && styles.stepTextActive]}>
                선택
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {currentStep === 'upload' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <FileUpload onFileSelect={handleFileSelect} />
            {uploadedFile && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setCurrentStep('company')}
              >
                <Text style={styles.primaryButtonText}>다음</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {currentStep === 'company' && (
          <View style={styles.companyStepContainer}>
            <CompanySelector
              onCompanySelect={handleCompanySelect}
              selectedCompany={selectedCompany || undefined}
              onPositionSelect={handlePositionSelect}
              selectedPosition={selectedPosition || undefined}
              onExperienceSelect={handleExperienceSelect}
              selectedExperience={selectedExperience || undefined}
            />
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setCurrentStep('upload')}
              >
                <Text style={styles.secondaryButtonText}>← 이전</Text>
              </TouchableOpacity>
              {selectedCompany && selectedPosition && selectedExperience && (
                <TouchableOpacity style={styles.primaryButton} onPress={handleStartAnalysis}>
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? '시작 중...' : '분석 시작'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {currentStep === 'chat' && (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onEndInterview={handleEndInterview}
            isLoading={isLoading}
          />
        )}

        {currentStep === 'review' && selectedCompany && selectedPosition && selectedExperience && (
          <InterviewReview
            messages={messages}
            company={selectedCompany}
            position={selectedPosition}
            experience={selectedExperience}
            onSave={handleSaveReview}
            onClose={handleCloseReview}
          />
        )}

        {currentStep === 'saved' && (
          <SavedInterviews onClose={handleCloseSaved} onSelectRecord={handleSelectRecord} />
        )}

        {currentStep === 'viewRecord' && selectedRecord && (
          <View style={styles.viewRecordContainer}>
            <View style={styles.viewRecordHeader}>
              <TouchableOpacity onPress={handleCloseRecord} style={styles.backButton}>
                <Text style={styles.backButtonText}>← 목록</Text>
              </TouchableOpacity>
              <View style={styles.headerButtonGroup}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => handleRetryInterview(selectedRecord)}
                >
                  <Text style={styles.retryButtonText}>↻ 다시 연습</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, showDifficultOnly && styles.filterButtonActive]}
                  onPress={() => setShowDifficultOnly(!showDifficultOnly)}
                >
                  <Text style={[styles.filterButtonText, showDifficultOnly && styles.filterButtonTextActive]}>
                    {showDifficultOnly ? '✓ 어려운 질문만' : '어려운 질문만'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.viewRecordContent} showsVerticalScrollIndicator={false}>
              <View style={styles.recordMetaInfo}>
                <Text style={styles.recordCompany}>{selectedRecord.company.name}</Text>
                <Text style={styles.recordDate}>
                  {new Date(selectedRecord.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              {(showDifficultOnly
                ? getDifficultQuestions(selectedRecord)
                : selectedRecord.messages.filter(m => m.role === 'assistant')
              ).map((msg, index) => {
                const userResponse = selectedRecord.messages.find(
                  (m, i) =>
                    m.role === 'user' &&
                    i > selectedRecord.messages.indexOf(msg)
                );
                const isDifficult = selectedRecord.difficultQuestions.includes(msg.id);

                return (
                  <View key={msg.id} style={styles.savedQuestionCard}>
                    <View style={styles.savedQuestionHeader}>
                      <Text style={styles.savedQuestionNumber}>Q{index + 1}</Text>
                      {isDifficult && (
                        <View style={styles.difficultBadge}>
                          <Text style={styles.difficultBadgeText}>어려웠음</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.savedQuestionText}>{msg.content}</Text>
                    {userResponse && (
                      <View style={styles.savedAnswerBox}>
                        <Text style={styles.savedAnswerLabel}>내 답변</Text>
                        <Text style={styles.savedAnswerText}>{userResponse.content}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      <SaveSuccessModal
        visible={showSaveModal}
        difficultCount={lastDifficultCount}
        onViewNow={handleViewSavedNow}
        onViewList={handleViewSavedList}
        onNewInterview={handleStartNewInterview}
      />

      <ConsentModal
        visible={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  savedButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedButtonText: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  resetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 20,
    color: '#333333',
  },
  progressContainer: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  stepDotActive: {
    backgroundColor: '#000000',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  stepTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  companyStepContainer: {
    flex: 1,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  viewRecordContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  viewRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  headerButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  filterButtonTextActive: {
    color: '#FF9800',
  },
  viewRecordContent: {
    flex: 1,
    padding: 24,
  },
  recordMetaInfo: {
    marginBottom: 24,
  },
  recordCompany: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 14,
    color: '#666666',
  },
  savedQuestionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  savedQuestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedQuestionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0066FF',
  },
  difficultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFF3E0',
  },
  difficultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  savedQuestionText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
    marginBottom: 12,
  },
  savedAnswerBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  savedAnswerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 6,
  },
  savedAnswerText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
});
