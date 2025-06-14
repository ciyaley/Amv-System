// app/components/__tests__/MemoWindow.editing-tags.test.tsx - Memo Window Editing and Tags Tests
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoWindow } from '../../workspace/Memowindow';
import { 
  setupMocks, 
  setupMockProviders, 
  resetAllMocks, 
  createSampleMemo,
  mockUseMemos
} from './memo-window-test-helpers';

describe('MemoWindow - Editing and Tags', () => {
  beforeEach(() => {
    setupMocks();
    setupMockProviders();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should enter edit mode on double click', async () => {
    const memo = createSampleMemo();

    render(<MemoWindow memo={memo} isSelected={true} />);

    const memoElement = screen.getByTestId(`memo-window-${memo.id}`);
    
    // Double click to enter edit mode
    fireEvent.doubleClick(memoElement);

    await waitFor(() => {
      expect(screen.getByTestId('title-input')).toBeInTheDocument();
      expect(screen.getByTestId('content-textarea')).toBeInTheDocument();
    });
  });

  it('should save changes when clicking save button', async () => {
    const memo = createSampleMemo({
      title: 'Original Title',
      content: 'Original Content'
    });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('title-input')).toBeInTheDocument();
    });

    // Edit content
    const titleInput = screen.getByTestId('title-input') as HTMLInputElement;
    const contentTextarea = screen.getByTestId('content-textarea') as HTMLTextAreaElement;

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Updated Title');
    
    await userEvent.clear(contentTextarea);
    await userEvent.type(contentTextarea, 'Updated Content');

    // Save changes
    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUseMemos.updateMemo).toHaveBeenCalledWith(memo.id, {
        title: 'Updated Title',
        content: 'Updated Content'
      });
    });
  });

  it('should cancel changes when clicking cancel button', async () => {
    const memo = createSampleMemo({
      title: 'Original Title',
      content: 'Original Content'
    });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('title-input')).toBeInTheDocument();
    });

    // Edit content
    const titleInput = screen.getByTestId('title-input') as HTMLInputElement;
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Changed Title');

    // Cancel changes
    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      // Should exit edit mode
      expect(screen.queryByTestId('title-input')).not.toBeInTheDocument();
      // Should show original content
      expect(screen.getByText('Original Title')).toBeInTheDocument();
    });

    // Should not save changes
    expect(mockUseMemos.updateMemo).not.toHaveBeenCalled();
  });

  it('should handle empty title by setting default', async () => {
    const memo = createSampleMemo({ title: 'Original Title' });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('title-input')).toBeInTheDocument();
    });

    // Clear title
    const titleInput = screen.getByTestId('title-input') as HTMLInputElement;
    await userEvent.clear(titleInput);

    // Save with empty title
    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUseMemos.updateMemo).toHaveBeenCalledWith(memo.id, {
        title: expect.stringMatching(/untitled|memo|default/i), // Default title pattern
        content: memo.content
      });
    });
  });

  it('should add new tags correctly', async () => {
    const memo = createSampleMemo({ tags: ['existing'] });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });

    // Add new tag
    const tagInput = screen.getByTestId('tag-input') as HTMLInputElement;
    await userEvent.type(tagInput, 'newtag');

    const addTagButton = screen.getByTestId('add-tag-button');
    fireEvent.click(addTagButton);

    // Save changes
    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUseMemos.updateMemo).toHaveBeenCalledWith(memo.id, {
        title: memo.title,
        content: memo.content,
        tags: expect.arrayContaining(['existing', 'newtag'])
      });
    });
  });

  it('should add tags by pressing Enter', async () => {
    const memo = createSampleMemo({ tags: ['work'] });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });

    // Add new tag with Enter key
    const tagInput = screen.getByTestId('tag-input') as HTMLInputElement;
    await userEvent.type(tagInput, 'urgent{enter}');

    // Tag should be added to the list
    await waitFor(() => {
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });

    // Input should be cleared
    expect(tagInput.value).toBe('');
  });

  it('should prevent duplicate tags', async () => {
    const memo = createSampleMemo({ tags: ['work', 'important'] });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });

    // Try to add existing tag
    const tagInput = screen.getByTestId('tag-input') as HTMLInputElement;
    await userEvent.type(tagInput, 'work');

    const addTagButton = screen.getByTestId('add-tag-button');
    fireEvent.click(addTagButton);

    // Should not add duplicate
    const workTags = screen.getAllByText('work');
    expect(workTags).toHaveLength(1); // Only one instance should exist
  });

  it('should remove tags correctly', async () => {
    const memo = createSampleMemo({ tags: ['work', 'important', 'urgent'] });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    // Remove a tag
    const removeTagButton = screen.getByTestId('remove-tag-important');
    fireEvent.click(removeTagButton);

    // Tag should be removed from display
    await waitFor(() => {
      expect(screen.queryByText('important')).not.toBeInTheDocument();
    });

    // Save changes
    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUseMemos.updateMemo).toHaveBeenCalledWith(memo.id, {
        title: memo.title,
        content: memo.content,
        tags: expect.arrayContaining(['work', 'urgent'])
      });
      
      // Should not contain removed tag
      const updateCall = mockUseMemos.updateMemo.mock.calls[0][1];
      expect(updateCall.tags).not.toContain('important');
    });
  });

  it('should handle keyboard shortcuts in edit mode', async () => {
    const memo = createSampleMemo();

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('title-input')).toBeInTheDocument();
    });

    const titleInput = screen.getByTestId('title-input') as HTMLInputElement;
    titleInput.focus();

    // Test Ctrl+S for save
    fireEvent.keyDown(titleInput, { key: 's', ctrlKey: true });

    await waitFor(() => {
      expect(mockUseMemos.updateMemo).toHaveBeenCalled();
    });
  });

  it('should validate tag input format', async () => {
    const memo = createSampleMemo({ tags: [] });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });

    // Try to add invalid tags
    const tagInput = screen.getByTestId('tag-input') as HTMLInputElement;
    
    // Empty tag
    await userEvent.type(tagInput, '   ');
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    // Should not add empty tag
    expect(tagInput.value).toBe('   ');

    // Clear and try special characters
    await userEvent.clear(tagInput);
    await userEvent.type(tagInput, 'tag@#$');
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    // Should sanitize or reject invalid characters
    const addedTag = screen.queryByText('tag@#$');
    expect(addedTag).not.toBeInTheDocument();
  });

  it('should preserve memo state when exiting edit mode without saving', async () => {
    const memo = createSampleMemo({
      title: 'Original Title',
      content: 'Original Content',
      tags: ['original']
    });

    render(<MemoWindow memo={memo} isSelected={true} />);

    // Enter edit mode
    fireEvent.doubleClick(screen.getByTestId(`memo-window-${memo.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('title-input')).toBeInTheDocument();
    });

    // Make changes
    const titleInput = screen.getByTestId('title-input') as HTMLInputElement;
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Modified Title');

    // Exit edit mode by clicking outside (if supported) or pressing Escape
    fireEvent.keyDown(titleInput, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('title-input')).not.toBeInTheDocument();
    });

    // Should show original content
    expect(screen.getByText('Original Title')).toBeInTheDocument();
    expect(screen.getByText('Original Content')).toBeInTheDocument();
    expect(screen.getByText('original')).toBeInTheDocument();

    // Should not have saved changes
    expect(mockUseMemos.updateMemo).not.toHaveBeenCalled();
  });
});