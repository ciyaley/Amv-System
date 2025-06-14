// app/components/__tests__/SettingsIntegration.authentication.test.tsx - Authentication Workflow Tests
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { AccountSettings } from '../AccountSettings';
import { 
  setupMocks, 
  resetMockStates, 
  mockUseAuth,
  setupAuthenticatedUser,
  setupGuestUser,
  expectAuthenticatedUI,
  expectGuestUI
} from './settings-integration-test-helpers';

// Setup mocks
setupMocks();

describe('Settings Integration - Authentication Workflow', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    resetMockStates();
  });

  it('should complete guest to authenticated user workflow', async () => {
    // Phase 1: Guest state - show login/register tabs
    setupGuestUser();
    render(<AccountSettings />);
    
    expectGuestUI(screen);
  });

  it('should display authenticated user interface when logged in', async () => {
    // Setup authenticated state
    setupAuthenticatedUser('test@example.com', 'test-uuid-123');
    
    render(<AccountSettings />);
    
    // Verify authenticated state UI
    expectAuthenticatedUI(screen);
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it('should handle logout workflow', async () => {
    // Setup authenticated state
    setupAuthenticatedUser('test@example.com');
    mockUseAuth.logout.mockResolvedValue(undefined);
    
    render(<AccountSettings />);
    
    const logoutButton = screen.getByText('ログアウト');
    await user.click(logoutButton);
    
    expect(mockUseAuth.logout).toHaveBeenCalled();
  });

  it('should handle account deletion workflow with email confirmation', async () => {
    // Setup authenticated state
    setupAuthenticatedUser('test@example.com');
    mockUseAuth.deleteAccount.mockResolvedValue(undefined);
    
    render(<AccountSettings />);
    
    // Start account deletion process
    const deleteButton = screen.getByText('アカウントを削除');
    await user.click(deleteButton);
    
    // Enter confirmation email
    const confirmInput = screen.getByPlaceholderText(/確認のためメールアドレスを入力/);
    await user.type(confirmInput, 'test@example.com');
    
    // Submit deletion  
    const confirmDeleteButton = screen.getByText('アカウントを削除');
    await user.click(confirmDeleteButton);
    
    expect(mockUseAuth.deleteAccount).toHaveBeenCalled();
  });

  it('should prevent account deletion with incorrect email', async () => {
    setupAuthenticatedUser('test@example.com');
    
    render(<AccountSettings />);
    
    const deleteButton = screen.getByText('アカウントを削除');
    await user.click(deleteButton);
    
    // Enter wrong email
    const confirmInput = screen.getByPlaceholderText(/確認のためメールアドレスを入力/);
    await user.type(confirmInput, 'wrong@example.com');
    
    const confirmDeleteButton = screen.getByText('アカウントを削除');
    await user.click(confirmDeleteButton);
    
    // Should not call deleteAccount
    expect(mockUseAuth.deleteAccount).not.toHaveBeenCalled();
  });
});