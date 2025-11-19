import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';

interface SaveSuccessModalProps {
  visible: boolean;
  difficultCount: number;
  onViewNow: () => void;
  onViewList: () => void;
  onNewInterview: () => void;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({
  visible,
  difficultCount,
  onViewNow,
  onViewList,
  onNewInterview,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onNewInterview}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>저장 완료!</Text>
            {difficultCount > 0 && (
              <Text style={styles.subtitle}>
                어려웠던 질문 {difficultCount}개를 체크하셨네요!
              </Text>
            )}
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>면접 내용이 저장되었습니다.</Text>
            <Text style={styles.hint}>다음 중 하나를 선택하세요:</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={onViewNow}>
              <Text style={styles.primaryButtonText}>바로 복습하기</Text>
              {difficultCount > 0 && (
                <Text style={styles.buttonHint}>어려운 질문만 보기</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onViewList}>
              <Text style={styles.secondaryButtonText}>저장 목록 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tertiaryButton} onPress={onNewInterview}>
              <Text style={styles.tertiaryButtonText}>새 면접 시작</Text>
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
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#FF9800',
    fontWeight: '600',
  },
  content: {
    marginBottom: 24,
    gap: 8,
  },
  description: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '500',
  },
});
