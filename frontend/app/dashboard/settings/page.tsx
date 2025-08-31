'use client';

import { useState, useEffect } from 'react';
import { Settings, User, Volume2, Bell, Shield, Database, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserSettings {
  profile: {
    name: string;
    email: string;
    role: string;
  };
  audio: {
    defaultVolume: number;
    autoPlay: boolean;
    fadeTransitions: boolean;
  };
  engagement: {
    autoSuggest: boolean;
    suggestionDelay: number;
    defaultEngagement: 'LOW' | 'MED' | 'HIGH';
  };
  notifications: {
    sessionReminders: boolean;
    achievementAlerts: boolean;
    soundEnabled: boolean;
  };
  privacy: {
    saveSessionData: boolean;
    anonymousAnalytics: boolean;
    dataSharingConsent: boolean;
  };
  advanced: {
    debugMode: boolean;
    apiEndpoint: string;
    sessionTimeout: number;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      name: 'User',
      email: 'user@example.com',
      role: 'Caregiver'
    },
    audio: {
      defaultVolume: 70,
      autoPlay: false,
      fadeTransitions: true
    },
    engagement: {
      autoSuggest: false,
      suggestionDelay: 5,
      defaultEngagement: 'MED'
    },
    notifications: {
      sessionReminders: true,
      achievementAlerts: true,
      soundEnabled: false
    },
    privacy: {
      saveSessionData: true,
      anonymousAnalytics: true,
      dataSharingConsent: false
    },
    advanced: {
      debugMode: false,
      apiEndpoint: 'http://localhost:8000',
      sessionTimeout: 30
    }
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/backend/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backend/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
        setHasChanges(false);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      loadSettings();
      setHasChanges(false);
      toast.success('Settings reset to defaults');
    }
  };

  const updateSettings = (category: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'engagement', label: 'Engagement', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'advanced', label: 'Advanced', icon: Database }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your application preferences
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={resetSettings}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={!hasChanges || loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You have unsaved changes. Don't forget to save before leaving this page.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Navigation */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          <div className="card p-6">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>

                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={settings.profile.name}
                    onChange={(e) => updateSettings('profile', 'name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => updateSettings('profile', 'email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    value={settings.profile.role}
                    onChange={(e) => updateSettings('profile', 'role', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-800"
                  >
                    <option value="Caregiver">Caregiver</option>
                    <option value="Therapist">Therapist</option>
                    <option value="Parent">Parent</option>
                    <option value="Teacher">Teacher</option>
                  </select>
                </div>
              </div>
            )}

            {/* Audio Settings */}
            {activeTab === 'audio' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Audio Settings</h2>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Default Volume: {settings.audio.defaultVolume}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.audio.defaultVolume}
                    onChange={(e) => updateSettings('audio', 'defaultVolume', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Auto-play music on session start</label>
                  <input
                    type="checkbox"
                    checked={settings.audio.autoPlay}
                    onChange={(e) => updateSettings('audio', 'autoPlay', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Enable fade transitions</label>
                  <input
                    type="checkbox"
                    checked={settings.audio.fadeTransitions}
                    onChange={(e) => updateSettings('audio', 'fadeTransitions', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            )}

            {/* Engagement Settings */}
            {activeTab === 'engagement' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Engagement Settings</h2>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Auto-suggest on engagement change</label>
                  <input
                    type="checkbox"
                    checked={settings.engagement.autoSuggest}
                    onChange={(e) => updateSettings('engagement', 'autoSuggest', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Suggestion Delay: {settings.engagement.suggestionDelay} seconds
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={settings.engagement.suggestionDelay}
                    onChange={(e) => updateSettings('engagement', 'suggestionDelay', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Default Engagement Level</label>
                  <select
                    value={settings.engagement.defaultEngagement}
                    onChange={(e) => updateSettings('engagement', 'defaultEngagement', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-800"
                  >
                    <option value="LOW">Low</option>
                    <option value="MED">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Session reminders</label>
                  <input
                    type="checkbox"
                    checked={settings.notifications.sessionReminders}
                    onChange={(e) => updateSettings('notifications', 'sessionReminders', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Achievement alerts</label>
                  <input
                    type="checkbox"
                    checked={settings.notifications.achievementAlerts}
                    onChange={(e) => updateSettings('notifications', 'achievementAlerts', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Sound notifications</label>
                  <input
                    type="checkbox"
                    checked={settings.notifications.soundEnabled}
                    onChange={(e) => updateSettings('notifications', 'soundEnabled', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Privacy Settings</h2>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Save session data locally</label>
                  <input
                    type="checkbox"
                    checked={settings.privacy.saveSessionData}
                    onChange={(e) => updateSettings('privacy', 'saveSessionData', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Anonymous analytics</label>
                  <input
                    type="checkbox"
                    checked={settings.privacy.anonymousAnalytics}
                    onChange={(e) => updateSettings('privacy', 'anonymousAnalytics', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Data sharing consent</label>
                  <input
                    type="checkbox"
                    checked={settings.privacy.dataSharingConsent}
                    onChange={(e) => updateSettings('privacy', 'dataSharingConsent', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Your privacy is important to us. All data is stored locally and encrypted.
                    We never share your personal information without explicit consent.
                  </p>
                </div>
              </div>
            )}

            {/* Advanced Settings */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Advanced Settings</h2>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Debug mode</label>
                  <input
                    type="checkbox"
                    checked={settings.advanced.debugMode}
                    onChange={(e) => updateSettings('advanced', 'debugMode', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">API Endpoint</label>
                  <input
                    type="text"
                    value={settings.advanced.apiEndpoint}
                    onChange={(e) => updateSettings('advanced', 'apiEndpoint', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-primary dark:bg-gray-800 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Session Timeout: {settings.advanced.sessionTimeout} minutes
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={settings.advanced.sessionTimeout}
                    onChange={(e) => updateSettings('advanced', 'sessionTimeout', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    ⚠️ Warning: These settings are for advanced users only.
                    Incorrect configuration may affect application functionality.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}