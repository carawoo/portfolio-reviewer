import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, TouchableOpacity, Text, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FileUpload } from './components/FileUpload';
import { CompanySelector } from './components/CompanySelector';
import { ChatInterface } from './components/ChatInterface';
import { UploadedFile, Company, Message, Position, Experience } from './types';
import { analyzePortfolio } from './services/api';

type Step = 'upload' | 'company' | 'chat';

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      Alert.alert('알림', '파일, 회사, 직무, 경력을 모두 선택해주세요.');
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
      console.error('Error starting analysis:', error);
      const errorMsg = error.response?.data?.error || error.message || '분석을 시작할 수 없습니다.';
      Alert.alert('오류', errorMsg);
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
      Alert.alert('오류', error.message || '메시지를 전송할 수 없습니다.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setSelectedCompany(null);
    setMessages([]);
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
        {currentStep === 'chat' && (
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>↻</Text>
          </TouchableOpacity>
        )}
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
            isLoading={isLoading}
          />
        )}
      </View>
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
});
