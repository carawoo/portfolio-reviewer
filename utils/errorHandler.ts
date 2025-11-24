/**
 * 에러를 사용자에게 보여줄 수 있는 문자열로 변환
 */
export const getErrorMessage = (error: any): string => {
  // 1. Axios 에러인 경우
  if (error?.response) {
    // 서버가 응답을 반환한 경우
    const responseData = error.response.data;

    if (typeof responseData === 'string') {
      return responseData;
    }

    if (responseData?.error) {
      return typeof responseData.error === 'string'
        ? responseData.error
        : JSON.stringify(responseData.error);
    }

    if (responseData?.message) {
      return typeof responseData.message === 'string'
        ? responseData.message
        : JSON.stringify(responseData.message);
    }

    // HTTP 상태 코드별 메시지
    switch (error.response.status) {
      case 400:
        return '잘못된 요청입니다. 입력 정보를 확인해주세요.';
      case 401:
        return '인증이 필요합니다.';
      case 403:
        return '접근 권한이 없습니다.';
      case 404:
        return '요청한 리소스를 찾을 수 없습니다.';
      case 413:
        return '대화가 너무 길어졌습니다.\n\n💡 해결 방법:\n1. "면접 종료" 버튼을 눌러 현재 면접을 저장하세요\n2. 새로운 면접을 시작해주세요\n\n※ 면접 기록은 안전하게 저장됩니다.';
      case 429:
        return 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      case 500:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 502:
      case 503:
      case 504:
        return '서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.';
      default:
        return `서버 오류 (${error.response.status}): ${error.response.statusText}`;
    }
  }

  // 2. 네트워크 에러인 경우
  if (error?.request) {
    // 요청은 보냈지만 응답을 받지 못한 경우
    if (error.code === 'ECONNABORTED') {
      return '요청 시간이 초과되었습니다. 파일이 너무 크거나 네트워크가 느립니다.';
    }

    if (error.code === 'ERR_NETWORK') {
      return '네트워크 연결을 확인해주세요.';
    }

    if (error.code === 'ERR_CONNECTION_REFUSED') {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
    }

    return '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.';
  }

  // 3. Error 객체인 경우
  if (error instanceof Error) {
    // 일반적인 에러 메시지들을 사용자 친화적으로 변환
    const message = error.message;

    if (message.includes('Network Error')) {
      return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
    }

    if (message.includes('timeout')) {
      return '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
    }

    if (message.includes('API')) {
      return message; // API 관련 에러는 그대로 표시
    }

    return message;
  }

  // 4. 문자열 에러인 경우
  if (typeof error === 'string') {
    return error;
  }

  // 5. 그 외의 경우 - JSON으로 변환 시도
  try {
    const stringified = JSON.stringify(error);
    if (stringified && stringified !== '{}' && stringified !== 'null') {
      return `오류가 발생했습니다: ${stringified}`;
    }
  } catch (e) {
    // JSON 변환 실패
  }

  // 6. 마지막 fallback
  return '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
};

/**
 * 에러를 콘솔에 상세히 로깅
 */
export const logError = (context: string, error: any) => {
  console.group(`❌ Error in ${context}`);
  console.error('Error object:', error);

  if (error?.response) {
    console.error('Response status:', error.response.status);
    console.error('Response data:', error.response.data);
    console.error('Response headers:', error.response.headers);
  }

  if (error?.request) {
    console.error('Request:', error.request);
  }

  if (error?.config) {
    console.error('Config:', {
      url: error.config.url,
      method: error.config.method,
      data: error.config.data,
    });
  }

  console.error('Stack trace:', error?.stack);
  console.groupEnd();
};
