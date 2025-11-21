import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';

interface ConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>클라우드 백업 동의</Text>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              면접 기록을 클라우드에 안전하게 백업하시겠습니까?
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ 수집하는 정보</Text>
              <Text style={styles.text}>
                • 선택한 회사 정보 (회사명, 산업 분야)
                {'\n'}• 직무 및 경력 정보
                {'\n'}• 면접 대화 내용
                {'\n'}• 업로드한 포트폴리오 파일
                {'\n'}• 어려웠던 질문 표시
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 사용 목적</Text>
              <Text style={styles.text}>
                • 여러 기기에서 면접 기록 동기화
                {'\n'}• 데이터 손실 방지
                {'\n'}• 서비스 개선 및 품질 향상
                {'\n'}• 통계 분석 (익명화된 데이터)
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔒 개인정보 보호</Text>
              <Text style={styles.text}>
                • 모든 데이터는 암호화되어 안전하게 저장됩니다
                {'\n'}• 제3자에게 데이터를 제공하지 않습니다
                {'\n'}• 언제든지 데이터 삭제를 요청할 수 있습니다
                {'\n'}• 관련 법률을 준수합니다
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ℹ️ 거부할 경우</Text>
              <Text style={styles.text}>
                • 면접 기록은 현재 기기에만 저장됩니다
                {'\n'}• 다른 기기에서 접근할 수 없습니다
                {'\n'}• 브라우저 데이터 삭제 시 기록이 사라집니다
                {'\n'}• 나중에 설정에서 변경할 수 있습니다
              </Text>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
              <Text style={styles.acceptButtonText}>동의하고 백업하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
              <Text style={styles.declineButtonText}>로컬에만 저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  contentScroll: {
    maxHeight: 400,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
