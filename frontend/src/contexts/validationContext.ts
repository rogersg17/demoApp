import { createContext } from 'react';
import type { ValidationContextType } from '../types/validation';

export const ValidationContext = createContext<ValidationContextType | null>(null);
