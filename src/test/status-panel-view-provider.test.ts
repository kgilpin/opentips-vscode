import { StatusPanelViewProvider } from '../webviews/status-panel';
import { IProviderStatus } from '../lib/status-panel';
import EventEmitter from 'events';
import * as vscode from 'vscode';

// Minimal mock for vscode
jest.mock('vscode', () => ({
  commands: {
    executeCommand: jest.fn(),
  },
  window: {
    createWebviewPanel: jest.fn(),
  },
  // Add other necessary vscode mocks if your tests require them
}));

// Mock MarkdownIt
jest.mock('markdown-it', () => {
  return jest.fn().mockImplementation(() => {
    return {
      render: jest.fn((text: string) => text), // Simple render mock
    };
  });
});


class MockProviderStatus extends EventEmitter implements IProviderStatus {
  isStarting = false;
  isServiceDirectoryAvailable = true;
  isServiceAvailable = true;
  pythonVersion: string | null = null; // Add this line

  isLanguageModelProviderAvailable = jest.fn(async () => true);
  dispose = jest.fn();
  portChanged = jest.fn();
  setPythonVersion = jest.fn((version: string | null) => { // Add this method
    this.pythonVersion = version;
    this.emit('pythonVersionDetected', version);
  });

  // Helper to emit events for testing
  emitEvent(eventName: string, ...args: any[]) {
    this.emit(eventName, ...args);
  }
}

describe('StatusPanelViewProvider', () => {
  let mockProviderStatus: MockProviderStatus;
  let statusPanelViewProvider: StatusPanelViewProvider;
  let mockWebviewView: vscode.WebviewView;

  beforeEach(() => {
    mockProviderStatus = new MockProviderStatus();
    statusPanelViewProvider = new StatusPanelViewProvider(mockProviderStatus);

    // Mock WebviewView
    mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: jest.fn(),
        asWebviewUri: jest.fn(),
        cspSource: '',
        postMessage: jest.fn(),
      },
      onDidDispose: jest.fn(),
      show: jest.fn(),
      title: undefined,
      description: undefined,
      visible: true,
      options: {
        supportsFindWidget: false,
        retainsContextWhenHidden: false,
      }
    } as unknown as vscode.WebviewView;

    // Call resolveWebviewView to set up the webviewView
    statusPanelViewProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
  });

  test('constructor should subscribe to pythonVersionDetected', () => {
    const onSpy = jest.spyOn(mockProviderStatus, 'on');
    new StatusPanelViewProvider(mockProviderStatus); // Re-instantiate to test constructor
    expect(onSpy).toHaveBeenCalledWith('pythonVersionDetected', expect.any(Function));
  });

  test('updateContent should render correct message for Python 11', async () => {
    // Directly set pythonVersion and call updateContent for simplicity in testing the rendering logic
    (statusPanelViewProvider as any).pythonVersion = "Python 11.0.1";
    await statusPanelViewProvider.updateContent();
    expect(mockWebviewView.webview.html).toContain("✅ Python 11 detected.");
  });
  
  test('updateContent should render correct message for other Python versions', async () => {
    (statusPanelViewProvider as any).pythonVersion = "Python 3.10.0";
    await statusPanelViewProvider.updateContent();
    expect(mockWebviewView.webview.html).toContain("ℹ️ Detected Python version: Python 3.10.0. (Python 11 not found)");
  });
  
  test('updateContent should render correct message when Python version is null', async () => {
    (statusPanelViewProvider as any).pythonVersion = null;
    await statusPanelViewProvider.updateContent();
    expect(mockWebviewView.webview.html).toContain("🐍 Python version check pending...");
  });

  // Test event triggering update
  test('pythonVersionDetected event should trigger updateContent and render Python 11 message', async () => {
    mockProviderStatus.emitEvent('pythonVersionDetected', "Python 11.0.1");
    // Wait for async operations within updateContent if any (e.g. if it becomes async)
    await Promise.resolve(); 
    expect(mockWebviewView.webview.html).toContain("✅ Python 11 detected.");
  });

  test('pythonVersionDetected event should trigger updateContent and render other Python version message', async () => {
    mockProviderStatus.emitEvent('pythonVersionDetected', "Python 3.10.0");
    await Promise.resolve();
    expect(mockWebviewView.webview.html).toContain("ℹ️ Detected Python version: Python 3.10.0. (Python 11 not found)");
  });

  test('pythonVersionDetected event should trigger updateContent and render pending message', async () => {
    mockProviderStatus.emitEvent('pythonVersionDetected', null);
    await Promise.resolve();
    expect(mockWebviewView.webview.html).toContain("🐍 Python version check pending...");
  });

});
