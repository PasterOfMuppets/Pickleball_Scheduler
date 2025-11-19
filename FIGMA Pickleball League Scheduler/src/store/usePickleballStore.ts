import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'vacation' | 'inactive';
  vacationUntil?: string;
  smsConsent: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  isAdmin?: boolean;
}

export interface AvailabilitySlot {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  isException?: boolean; // if true, this removes availability
  recurringPatternId?: string;
}

export interface RecurringPattern {
  id: string;
  userId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string;
  endTime: string;
  enabled: boolean;
  name: string;
}

export interface Match {
  id: string;
  challengerId: string;
  opponentId: string;
  date: string;
  startTime: string;
  duration: 60 | 90 | 120;
  status: 'pending' | 'confirmed' | 'declined' | 'canceled' | 'expired';
  createdAt: string;
  cancelReason?: string;
  canceledBy?: string;
}

interface PickleballStore {
  currentUser: User | null;
  impersonatedUser: User | null;
  users: User[];
  availability: AvailabilitySlot[];
  recurringPatterns: RecurringPattern[];
  matches: Match[];
  login: (email: string, password: string) => void;
  logout: () => void;
  signup: (user: Omit<User, 'id' | 'status'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  addAvailability: (slots: Omit<AvailabilitySlot, 'id'>[]) => void;
  removeAvailability: (slotIds: string[]) => void;
  clearWeekAvailability: (userId: string, weekStart: string) => void;
  addRecurringPattern: (pattern: Omit<RecurringPattern, 'id'>) => void;
  updateRecurringPattern: (patternId: string, updates: Partial<RecurringPattern>) => void;
  deleteRecurringPattern: (patternId: string) => void;
  createChallenge: (challenge: Omit<Match, 'id' | 'createdAt' | 'status'>) => void;
  respondToChallenge: (matchId: string, accept: boolean) => void;
  cancelMatch: (matchId: string, reason?: string) => void;
  impersonate: (userId: string) => void;
  stopImpersonation: () => void;
  isAdmin: boolean;
}

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'You (Current User)',
    email: 'you@example.com',
    phone: '+1234567890',
    status: 'active',
    smsConsent: true,
    smsEnabled: true,
    emailEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    isAdmin: true,
  },
  {
    id: '2',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1234567891',
    status: 'active',
    smsConsent: true,
    smsEnabled: true,
    emailEnabled: true,
  },
  {
    id: '3',
    name: 'Bob Smith',
    email: 'bob@example.com',
    phone: '+1234567892',
    status: 'active',
    smsConsent: true,
    smsEnabled: true,
    emailEnabled: true,
  },
  {
    id: '4',
    name: 'Carol Davis',
    email: 'carol@example.com',
    phone: '+1234567893',
    status: 'vacation',
    vacationUntil: '2025-11-25',
    smsConsent: true,
    smsEnabled: true,
    emailEnabled: true,
  },
  {
    id: '5',
    name: 'David Lee',
    email: 'david@example.com',
    phone: '+1234567894',
    status: 'active',
    smsConsent: false,
    smsEnabled: false,
    emailEnabled: true,
  },
];

const mockAvailability: AvailabilitySlot[] = [
  // User 1 (current user) availability
  {
    id: 'a1',
    userId: '1',
    date: '2025-11-18',
    startTime: '18:00',
    endTime: '20:00',
    isRecurring: true,
    recurringPatternId: 'rp1',
  },
  {
    id: 'a2',
    userId: '1',
    date: '2025-11-20',
    startTime: '18:00',
    endTime: '20:00',
    isRecurring: true,
    recurringPatternId: 'rp2',
  },
  // Alice availability (overlap with user 1)
  {
    id: 'a3',
    userId: '2',
    date: '2025-11-18',
    startTime: '18:00',
    endTime: '19:30',
    isRecurring: true,
  },
  {
    id: 'a4',
    userId: '2',
    date: '2025-11-20',
    startTime: '18:30',
    endTime: '21:00',
    isRecurring: false,
  },
];

const mockRecurringPatterns: RecurringPattern[] = [
  {
    id: 'rp1',
    userId: '1',
    dayOfWeek: 2, // Tuesday
    startTime: '18:00',
    endTime: '20:00',
    enabled: true,
    name: 'Tuesday Evening',
  },
  {
    id: 'rp2',
    userId: '1',
    dayOfWeek: 4, // Thursday
    startTime: '18:00',
    endTime: '20:00',
    enabled: true,
    name: 'Thursday Evening',
  },
];

const mockMatches: Match[] = [
  {
    id: 'm1',
    challengerId: '2',
    opponentId: '1',
    date: '2025-11-20',
    startTime: '18:00',
    duration: 90,
    status: 'pending',
    createdAt: '2025-11-17T10:00:00Z',
  },
  {
    id: 'm2',
    challengerId: '1',
    opponentId: '3',
    date: '2025-11-22',
    startTime: '19:00',
    duration: 60,
    status: 'confirmed',
    createdAt: '2025-11-16T14:30:00Z',
  },
];

export const usePickleballStore = create<PickleballStore>((set, get) => ({
  currentUser: mockUsers[0],
  impersonatedUser: null,
  users: mockUsers,
  availability: mockAvailability,
  recurringPatterns: mockRecurringPatterns,
  matches: mockMatches,
  isAdmin: true,

  login: (email: string) => {
    const user = get().users.find(u => u.email === email);
    if (user) {
      set({ currentUser: user, isAdmin: user.isAdmin || false });
    }
  },

  logout: () => {
    set({ currentUser: null, impersonatedUser: null, isAdmin: false });
  },

  signup: (userData) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      status: 'active',
      smsEnabled: userData.smsConsent,
      emailEnabled: true,
    };
    set(state => ({
      users: [...state.users, newUser],
      currentUser: newUser,
    }));
  },

  updateUser: (userId: string, updates: Partial<User>) => {
    set(state => ({
      users: state.users.map(u => u.id === userId ? { ...u, ...updates } : u),
      currentUser: state.currentUser?.id === userId 
        ? { ...state.currentUser, ...updates }
        : state.currentUser,
    }));
  },

  addAvailability: (slots) => {
    const newSlots = slots.map(slot => ({
      ...slot,
      id: `slot-${Date.now()}-${Math.random()}`,
    }));
    set(state => ({
      availability: [...state.availability, ...newSlots],
    }));
  },

  removeAvailability: (slotIds) => {
    set(state => ({
      availability: state.availability.filter(s => !slotIds.includes(s.id)),
    }));
  },

  clearWeekAvailability: (userId: string, weekStart: string) => {
    set(state => ({
      availability: state.availability.filter(s => {
        if (s.userId !== userId) return true;
        const slotDate = new Date(s.date);
        const weekStartDate = new Date(weekStart);
        const weekEndDate = new Date(weekStart);
        weekEndDate.setDate(weekEndDate.getDate() + 7);
        return slotDate < weekStartDate || slotDate >= weekEndDate;
      }),
    }));
  },

  addRecurringPattern: (pattern) => {
    const newPattern: RecurringPattern = {
      ...pattern,
      id: `pattern-${Date.now()}`,
    };
    set(state => ({
      recurringPatterns: [...state.recurringPatterns, newPattern],
    }));
  },

  updateRecurringPattern: (patternId: string, updates: Partial<RecurringPattern>) => {
    set(state => ({
      recurringPatterns: state.recurringPatterns.map(p =>
        p.id === patternId ? { ...p, ...updates } : p
      ),
    }));
  },

  deleteRecurringPattern: (patternId: string) => {
    set(state => ({
      recurringPatterns: state.recurringPatterns.filter(p => p.id !== patternId),
      availability: state.availability.filter(s => s.recurringPatternId !== patternId),
    }));
  },

  createChallenge: (challenge) => {
    const newMatch: Match = {
      ...challenge,
      id: `match-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    set(state => ({
      matches: [...state.matches, newMatch],
    }));
  },

  respondToChallenge: (matchId: string, accept: boolean) => {
    set(state => ({
      matches: state.matches.map(m =>
        m.id === matchId
          ? { ...m, status: accept ? 'confirmed' : 'declined' }
          : m
      ),
    }));
  },

  cancelMatch: (matchId: string, reason?: string) => {
    const currentUserId = get().impersonatedUser?.id || get().currentUser?.id;
    set(state => ({
      matches: state.matches.map(m =>
        m.id === matchId
          ? { ...m, status: 'canceled', cancelReason: reason, canceledBy: currentUserId }
          : m
      ),
    }));
  },

  impersonate: (userId: string) => {
    const user = get().users.find(u => u.id === userId);
    if (user && get().isAdmin) {
      set({ impersonatedUser: user });
    }
  },

  stopImpersonation: () => {
    set({ impersonatedUser: null });
  },
}));
