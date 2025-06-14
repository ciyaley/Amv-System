// utils/messageSystem/index.ts - 統一エクスポート

// ====================================================================================
// TYPE DEFINITIONS AND INTERFACES
// ====================================================================================

export type {
  MessageContext,
  StandardMessage
} from './message-templates';

export type {
  MessageDisplayHandler
} from './display-handlers';

// ====================================================================================
// MESSAGE TEMPLATES AND CREATION
// ====================================================================================

export {
  MESSAGE_TEMPLATES,
  getDurationForType,
  createMessage
} from './message-templates';

// ====================================================================================
// MESSAGE HELPERS
// ====================================================================================

export {
  MessageHelpers
} from './message-helpers';

// ====================================================================================
// DISPLAY HANDLERS
// ====================================================================================

export {
  SonnerMessageDisplayHandler,
  setGlobalMessageHandler,
  getGlobalMessageHandler,
  showMessage,
  showMessageWithActions
} from './display-handlers';

// ====================================================================================
// UTILITIES
// ====================================================================================

export {
  handleErrorWithMessage,
  logMessage,
  getMessageSeverity
} from './message-utils';

// ====================================================================================
// MODULE METADATA
// ====================================================================================

export const MESSAGE_SYSTEM_INFO = {
  version: '2.0.0',
  architecture: 'Modular Message System',
  modules: [
    'message-templates.ts (interfaces + templates)',
    'message-helpers.ts (common message helpers)',
    'display-handlers.ts (Sonner integration)',
    'message-utils.ts (error handling + utilities)',
    'index.ts (unified exports)'
  ],
  totalFiles: 5,
  originalFile: 'messageSystem.ts (555 lines)',
  benefits: [
    'clear separation of concerns',
    'improved maintainability',
    'better tree-shaking support',
    'easier testing of individual modules'
  ]
} as const;