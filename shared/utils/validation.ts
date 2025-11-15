export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '비밀번호는 최소 1개의 대문자를 포함해야 합니다' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '비밀번호는 최소 1개의 소문자를 포함해야 합니다' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '비밀번호는 최소 1개의 숫자를 포함해야 합니다' };
  }
  return { valid: true };
};

export const validateRequired = (fields: Record<string, any>): { valid: boolean; missing?: string[] } => {
  const missing = Object.entries(fields)
    .filter(([_, value]) => !value)
    .map(([key, _]) => key);

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};
