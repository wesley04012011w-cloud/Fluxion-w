export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  userId: string;
  images?: string[]; // Array of base64 image strings
  createdAt?: any;
}

export interface Chat {
  id: string;
  title: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Model {
  id: string;
  name: string;
  desc: string;
  cost: number;
  color?: string;
}

export interface UserProfile {
  credits: number;
  lastResetDate: string;
  isAdmin?: boolean;
}
